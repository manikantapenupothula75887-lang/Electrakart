import { db } from '../../db/connection.js';
import { distanceService } from '../location/distance.service.js';
import { geocodingService } from '../location/geocoding.service.js';
import { LocationCoordinates } from '../location/location.types.js';
import {
  FulfillmentCartItem,
  FulfillmentCandidate,
  FulfillmentGroup,
  FulfillmentGroupItem,
  FulfillmentPlan,
  UnfulfillableItem,
} from './fulfillment.types.js';

interface PartnerWithLocation {
  id: string;
  business_name: string;
  type: 'RETAILER' | 'DISTRIBUTOR';
  latitude: number;
  longitude: number;
  service_radius_km: number;
  is_active: boolean;
  status: string;
}

export class FulfillmentSelectionService {
  /**
   * Computes an authoritative fulfillment plan for a cart and delivery location.
   */
  async computeFulfillmentPlan(params: {
    items: FulfillmentCartItem[];
    location?: {
      latitude?: number;
      longitude?: number;
      addressId?: string;
      city?: string;
      pincode?: string;
    };
    userId?: string;
    clientPartnerHint?: string;
  }): Promise<FulfillmentPlan> {
    const { items, location = {}, userId, clientPartnerHint } = params;

    // 1. Resolve authoritative delivery coordinates
    let customerCoords: LocationCoordinates;
    let city = location.city || 'Vijayawada';
    let pincode = location.pincode || '520002';
    let normalizedAddress: string | undefined;

    if (location.addressId) {
      const addrRes = await db.query(
        'SELECT * FROM addresses WHERE id = $1',
        [location.addressId]
      );
      if (addrRes.rows.length > 0) {
        const addr = addrRes.rows[0];
        // IDOR verification if userId provided
        if (userId && addr.user_id && addr.user_id !== userId) {
          const err: any = new Error('Delivery address does not belong to the current user.');
          err.statusCode = 403;
          throw err;
        }

        city = addr.city;
        pincode = addr.pincode;
        normalizedAddress = addr.normalized_address;
        if (addr.latitude && addr.longitude) {
          customerCoords = {
            latitude: parseFloat(addr.latitude),
            longitude: parseFloat(addr.longitude),
          };
        } else {
          const resolved = await geocodingService.resolveLocation({
            address: `${addr.address_line1}, ${addr.city}`,
            pincode: addr.pincode,
          });
          customerCoords = { latitude: resolved.latitude, longitude: resolved.longitude };
        }
      } else {
        const err: any = new Error(`Delivery address ${location.addressId} not found.`);
        err.statusCode = 404;
        throw err;
      }
    } else if (
      location.latitude !== undefined &&
      location.longitude !== undefined &&
      !isNaN(location.latitude) &&
      !isNaN(location.longitude)
    ) {
      customerCoords = {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
      };
      if (!location.city || !location.pincode) {
        const rev = await geocodingService.resolveLocation(customerCoords);
        city = rev.city;
        pincode = rev.pincode;
        normalizedAddress = rev.formatted_address;
      }
    } else {
      const resolved = await geocodingService.resolveLocation({
        address: city,
        pincode,
      });
      customerCoords = { latitude: resolved.latitude, longitude: resolved.longitude };
      normalizedAddress = resolved.formatted_address;
    }

    if (items.length === 0) {
      return {
        is_fulfillable: true,
        fulfillment_type: 'SINGLE_PARTNER',
        delivery_location: {
          latitude: customerCoords.latitude,
          longitude: customerCoords.longitude,
          city,
          pincode,
          normalized_address: normalizedAddress,
        },
        groups: [],
        unfulfillable_items: [],
        summary: { total_items: 0, fulfilled_items: 0, total_amount: 0, group_count: 0 },
        calculated_at: new Date().toISOString(),
      };
    }

    // 2. Fetch all active partners and their location
    // We join stores and warehouses to find the actual active operational coordinates
    const partnersRes = await db.query<PartnerWithLocation>(`
      SELECT 
        p.id,
        p.business_name,
        p.type,
        COALESCE(s.latitude, w.latitude, p.latitude, 16.5167) as latitude,
        COALESCE(s.longitude, w.longitude, p.longitude, 80.6333) as longitude,
        COALESCE(s.service_radius_km, w.service_radius_km, p.service_radius_km, 10.00) as service_radius_km,
        p.is_active,
        p.status
      FROM partners p
      LEFT JOIN stores s ON s.partner_id = p.id AND s.is_active = TRUE
      LEFT JOIN warehouses w ON w.partner_id = p.id AND w.is_active = TRUE
      WHERE p.is_active = TRUE AND p.status = 'VERIFIED'
    `);

    // 3. Evaluate distances and filter by service radius
    const eligiblePartners: (PartnerWithLocation & {
      distance_km: number;
      duration_minutes: number;
      distance_mode: 'ROAD_NETWORK' | 'GEODESIC_FALLBACK';
      is_fallback: boolean;
    })[] = [];

    for (const p of partnersRes.rows) {
      const partnerCoords: LocationCoordinates = {
        latitude: parseFloat(p.latitude as any),
        longitude: parseFloat(p.longitude as any),
      };

      const distResult = await distanceService.calculateDistance(customerCoords, partnerCoords);
      const serviceRadius = parseFloat(p.service_radius_km as any) || 10.0;

      // Filter: out-of-service locations are strictly excluded
      if (distResult.distance_km <= serviceRadius) {
        eligiblePartners.push({
          ...p,
          service_radius_km: serviceRadius,
          distance_km: distResult.distance_km,
          duration_minutes: distResult.duration_minutes,
          distance_mode: distResult.mode,
          is_fallback: distResult.is_fallback,
        });
      }
    }

    // 4. Query PostgreSQL inventory for each eligible partner for requested SKUs
    const skuCodes = items.map((i) => i.sku_code);
    const invRes = await db.query<{
      partner_id: string;
      sku_code: string;
      in_stock_quantity: number;
      reserved_quantity: number;
      available_quantity: number;
      selling_price_inr: number;
      sku_name: string;
    }>(
      `SELECT 
         pi.partner_id,
         pi.sku_code,
         pi.in_stock_quantity,
         pi.reserved_quantity,
         (pi.in_stock_quantity - pi.reserved_quantity) as available_quantity,
         COALESCE(pi.selling_price_inr, s.selling_price_inr) as selling_price_inr,
         s.name as sku_name
       FROM partner_inventories pi
       JOIN skus s ON s.sku_code = pi.sku_code
       WHERE pi.sku_code = ANY($1)`,
      [skuCodes]
    );

    // Map inventories by partnerId -> sku_code -> stock details
    const partnerInventoryMap = new Map<
      string,
      Map<
        string,
        {
          available_quantity: number;
          selling_price_inr: number;
          sku_name: string;
        }
      >
    >();

    for (const row of invRes.rows) {
      if (!partnerInventoryMap.has(row.partner_id)) {
        partnerInventoryMap.set(row.partner_id, new Map());
      }
      partnerInventoryMap.get(row.partner_id)!.set(row.sku_code, {
        available_quantity: Math.max(0, parseInt(row.available_quantity as any, 10)),
        selling_price_inr: parseFloat(row.selling_price_inr as any),
        sku_name: row.sku_name,
      });
    }

    // 5. Build candidate profiles
    const candidates: FulfillmentCandidate[] = [];
    for (const p of eligiblePartners) {
      const pInv = partnerInventoryMap.get(p.id) || new Map();
      let canFulfillAll = true;
      const availableItems: {
        sku_code: string;
        available_quantity: number;
        allocated_quantity: number;
      }[] = [];

      for (const item of items) {
        const inv = pInv.get(item.sku_code);
        const avail = inv ? inv.available_quantity : 0;
        if (avail < item.quantity) {
          canFulfillAll = false;
        }
        availableItems.push({
          sku_code: item.sku_code,
          available_quantity: avail,
          allocated_quantity: 0,
        });
      }

      candidates.push({
        partner_id: p.id,
        partner_type: p.type,
        business_name: p.business_name,
        distance_km: p.distance_km,
        duration_minutes: p.duration_minutes,
        service_radius_km: p.service_radius_km,
        available_items: availableItems,
        can_fulfill_all: canFulfillAll,
        distance_mode: p.distance_mode,
        is_fallback: p.is_fallback,
      });
    }

    // 6. Multi-factor deterministic selection
    // Check if items have verified explicit preferred partners
    const itemsHavePreferences = items.some((i) => Boolean(i.preferred_partner_id));
    const allPreferencesValid =
      itemsHavePreferences &&
      items.every((item) => {
        if (!item.preferred_partner_id) return false;
        const cand = candidates.find((c) => c.partner_id === item.preferred_partner_id);
        if (!cand) return false;
        const pInv = partnerInventoryMap.get(cand.partner_id);
        if (!pInv) return false;
        const inv = pInv.get(item.sku_code);
        return Boolean(inv && inv.available_quantity >= item.quantity);
      });

    if (allPreferencesValid) {
      // Group items by their validated preferred partners
      const groupsByPartner = new Map<string, FulfillmentGroupItem[]>();
      for (const item of items) {
        const pId = item.preferred_partner_id!;
        const pInv = partnerInventoryMap.get(pId)!;
        const inv = pInv.get(item.sku_code)!;
        if (!groupsByPartner.has(pId)) {
          groupsByPartner.set(pId, []);
        }
        groupsByPartner.get(pId)!.push({
          sku_code: item.sku_code,
          quantity: item.quantity,
          unit_price: inv.selling_price_inr,
          subtotal: inv.selling_price_inr * item.quantity,
          item_name: inv.sku_name,
        });
      }

      const assignedGroups: FulfillmentGroup[] = [];
      for (const [pId, gItems] of groupsByPartner.entries()) {
        const cand = candidates.find((c) => c.partner_id === pId)!;
        const gTotal = gItems.reduce((acc, gi) => acc + gi.subtotal, 0);
        const etaHours =
          cand.partner_type === 'RETAILER' && cand.distance_km <= 10
            ? 2
            : cand.distance_km <= 25
            ? 4
            : 24;

        assignedGroups.push({
          partner_id: cand.partner_id,
          partner_type: cand.partner_type,
          partner_name: cand.business_name,
          distance_km: cand.distance_km,
          duration_minutes: cand.duration_minutes,
          distance_mode: cand.distance_mode,
          items: gItems,
          group_total: gTotal,
          estimated_delivery_hours: etaHours,
        });
      }

      const totalAmount = assignedGroups.reduce((acc, g) => acc + g.group_total, 0);
      const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);

      return {
        is_fulfillable: true,
        fulfillment_type: assignedGroups.length > 1 ? 'SPLIT_FULFILLMENT' : 'SINGLE_PARTNER',
        delivery_location: {
          latitude: customerCoords.latitude,
          longitude: customerCoords.longitude,
          city,
          pincode,
          normalized_address: normalizedAddress,
        },
        groups: assignedGroups,
        unfulfillable_items: [],
        summary: {
          total_items: totalUnits,
          fulfilled_items: totalUnits,
          total_amount: totalAmount,
          group_count: assignedGroups.length,
        },
        calculated_at: new Date().toISOString(),
      };
    }

    // Preference 1: Single-Partner Full Coverage
    const fullCoverageCandidates = candidates.filter((c) => c.can_fulfill_all);

    // If client provided a partner hint and that partner has full coverage and is in service, honor hint
    let selectedSinglePartner: FulfillmentCandidate | undefined;
    if (clientPartnerHint) {
      selectedSinglePartner = fullCoverageCandidates.find((c) => c.partner_id === clientPartnerHint);
    }

    // Otherwise, pick the closest full coverage partner
    if (!selectedSinglePartner && fullCoverageCandidates.length > 0) {
      fullCoverageCandidates.sort((a, b) => {
        // First sort by distance
        if (Math.abs(a.distance_km - b.distance_km) > 0.5) {
          return a.distance_km - b.distance_km;
        }
        // If distances comparable, prefer RETAILER for faster dispatch
        if (a.partner_type === 'RETAILER' && b.partner_type !== 'RETAILER') return -1;
        if (b.partner_type === 'RETAILER' && a.partner_type !== 'RETAILER') return 1;
        return a.distance_km - b.distance_km;
      });
      selectedSinglePartner = fullCoverageCandidates[0];
    }

    if (selectedSinglePartner) {
      // Build Single Partner Fulfillment Group
      const pInv = partnerInventoryMap.get(selectedSinglePartner.partner_id)!;
      const groupItems: FulfillmentGroupItem[] = items.map((i) => {
        const inv = pInv.get(i.sku_code)!;
        return {
          sku_code: i.sku_code,
          quantity: i.quantity,
          unit_price: inv.selling_price_inr,
          subtotal: inv.selling_price_inr * i.quantity,
          item_name: inv.sku_name,
        };
      });

      const groupTotal = groupItems.reduce((acc, gi) => acc + gi.subtotal, 0);
      const etaHours =
        selectedSinglePartner.partner_type === 'RETAILER' && selectedSinglePartner.distance_km <= 10
          ? 2
          : selectedSinglePartner.distance_km <= 25
          ? 4
          : 24;

      const group: FulfillmentGroup = {
        partner_id: selectedSinglePartner.partner_id,
        partner_type: selectedSinglePartner.partner_type,
        partner_name: selectedSinglePartner.business_name,
        distance_km: selectedSinglePartner.distance_km,
        duration_minutes: selectedSinglePartner.duration_minutes,
        distance_mode: selectedSinglePartner.distance_mode,
        items: groupItems,
        group_total: groupTotal,
        estimated_delivery_hours: etaHours,
      };

      return {
        is_fulfillable: true,
        fulfillment_type: 'SINGLE_PARTNER',
        delivery_location: {
          latitude: customerCoords.latitude,
          longitude: customerCoords.longitude,
          city,
          pincode,
          normalized_address: normalizedAddress,
        },
        groups: [group],
        unfulfillable_items: [],
        summary: {
          total_items: items.reduce((acc, i) => acc + i.quantity, 0),
          fulfilled_items: items.reduce((acc, i) => acc + i.quantity, 0),
          total_amount: groupTotal,
          group_count: 1,
        },
        calculated_at: new Date().toISOString(),
      };
    }

    // Preference 2: Greedy Split Fulfillment across minimum number of partners
    const remainingNeeds = new Map<string, number>();
    for (const item of items) {
      remainingNeeds.set(item.sku_code, item.quantity);
    }

    const assignedGroups: FulfillmentGroup[] = [];
    const availableCandidates = [...candidates].filter((c) =>
      c.available_items.some((ai) => ai.available_quantity > 0)
    );

    while (true) {
      let stillNeeded = 0;
      for (const needed of remainingNeeds.values()) {
        stillNeeded += needed;
      }
      if (stillNeeded === 0) break;

      // Find partner that can fulfill the most remaining units
      let bestPartner: FulfillmentCandidate | null = null;
      let bestCoverageCount = 0;

      for (const cand of availableCandidates) {
        let count = 0;
        const pInv = partnerInventoryMap.get(cand.partner_id);
        if (!pInv) continue;

        for (const [sku, needed] of remainingNeeds.entries()) {
          if (needed <= 0) continue;
          const inv = pInv.get(sku);
          if (inv && inv.available_quantity > 0) {
            count += Math.min(inv.available_quantity, needed);
          }
        }

        if (count > bestCoverageCount) {
          bestCoverageCount = count;
          bestPartner = cand;
        } else if (count === bestCoverageCount && count > 0 && bestPartner) {
          // Tie-break by distance
          if (cand.distance_km < bestPartner.distance_km) {
            bestPartner = cand;
          }
        }
      }

      if (!bestPartner || bestCoverageCount === 0) {
        // Cannot fulfill remaining items
        break;
      }

      // Allocate items from bestPartner
      const pInv = partnerInventoryMap.get(bestPartner.partner_id)!;
      const groupItems: FulfillmentGroupItem[] = [];

      for (const [sku, needed] of remainingNeeds.entries()) {
        if (needed <= 0) continue;
        const inv = pInv.get(sku);
        if (inv && inv.available_quantity > 0) {
          const allocate = Math.min(inv.available_quantity, needed);
          remainingNeeds.set(sku, needed - allocate);
          inv.available_quantity -= allocate;

          groupItems.push({
            sku_code: sku,
            quantity: allocate,
            unit_price: inv.selling_price_inr,
            subtotal: inv.selling_price_inr * allocate,
            item_name: inv.sku_name,
          });
        }
      }

      const groupTotal = groupItems.reduce((acc, gi) => acc + gi.subtotal, 0);
      const etaHours =
        bestPartner.partner_type === 'RETAILER' && bestPartner.distance_km <= 10
          ? 2
          : bestPartner.distance_km <= 25
          ? 4
          : 24;

      assignedGroups.push({
        partner_id: bestPartner.partner_id,
        partner_type: bestPartner.partner_type,
        partner_name: bestPartner.business_name,
        distance_km: bestPartner.distance_km,
        duration_minutes: bestPartner.duration_minutes,
        distance_mode: bestPartner.distance_mode,
        items: groupItems,
        group_total: groupTotal,
        estimated_delivery_hours: etaHours,
      });

      // Remove candidate from pool for next iteration
      const idx = availableCandidates.indexOf(bestPartner);
      if (idx !== -1) availableCandidates.splice(idx, 1);
    }

    // 7. Check for any unfulfillable items
    const unfulfillableItems: UnfulfillableItem[] = [];
    for (const [sku, needed] of remainingNeeds.entries()) {
      if (needed > 0) {
        const itemReq = items.find((i) => i.sku_code === sku);
        const reqQty = itemReq ? itemReq.quantity : needed;
        const fulfilledQty = reqQty - needed;

        // Check why it's unfulfillable
        const allStockRes = await db.query(
          'SELECT SUM(in_stock_quantity - reserved_quantity) as total_available FROM partner_inventories WHERE sku_code = $1',
          [sku]
        );
        const totalNetworkAvailable = parseInt(allStockRes.rows[0]?.total_available || '0', 10);

        let reason: 'OUT_OF_STOCK' | 'OUT_OF_SERVICE_RADIUS' = 'OUT_OF_STOCK';
        if (totalNetworkAvailable >= reqQty && eligiblePartners.length === 0) {
          reason = 'OUT_OF_SERVICE_RADIUS';
        }

        unfulfillableItems.push({
          sku_code: sku,
          requested_quantity: reqQty,
          available_quantity: fulfilledQty,
          reason,
        });
      }
    }

    const isFulfillable = unfulfillableItems.length === 0;
    const totalAmount = assignedGroups.reduce((acc, g) => acc + g.group_total, 0);
    const totalRequestedUnits = items.reduce((acc, i) => acc + i.quantity, 0);
    const totalFulfilledUnits = assignedGroups.reduce(
      (acc, g) => acc + g.items.reduce((giAcc, gi) => giAcc + gi.quantity, 0),
      0
    );

    return {
      is_fulfillable: isFulfillable,
      fulfillment_type: !isFulfillable
        ? 'UNSERVICEABLE'
        : assignedGroups.length > 1
        ? 'SPLIT_FULFILLMENT'
        : 'SINGLE_PARTNER',
      delivery_location: {
        latitude: customerCoords.latitude,
        longitude: customerCoords.longitude,
        city,
        pincode,
        normalized_address: normalizedAddress,
      },
      groups: assignedGroups,
      unfulfillable_items: unfulfillableItems,
      summary: {
        total_items: totalRequestedUnits,
        fulfilled_items: totalFulfilledUnits,
        total_amount: totalAmount,
        group_count: assignedGroups.length,
      },
      calculated_at: new Date().toISOString(),
    };
  }
}

export const fulfillmentSelectionService = new FulfillmentSelectionService();
