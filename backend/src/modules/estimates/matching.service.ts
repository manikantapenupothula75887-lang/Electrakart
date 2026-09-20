/**
 * ElectraKart Hierarchical Catalog Matching Engine
 *
 * Implements strict hierarchical filtering:
 * Category -> Brand -> Series -> Model / Specification -> Variant -> SKU.
 *
 * Enforces MANDATORY zero-false-positive rule:
 * Ambiguous or underspecified descriptions (e.g. "Anchor 6A switch") will NEVER
 * arbitrarily select a SKU and will always trigger clarification with candidate options.
 */

import { db } from '../../db/connection.js';
import {
  ExtractedLineItem,
  CandidateOption,
  MatchingEvidence,
  ConfidenceLevel,
  MatchStatus,
} from './ocr.types.js';

interface CatalogBrand {
  id: string;
  name: string;
}

interface CatalogSeries {
  id: string;
  brand_id: string;
  name: string;
}

interface CatalogSku {
  id: string;
  sku_code: string;
  name: string;
  category_id: string;
  brand_id: string;
  brand_name: string;
  series_id: string;
  series_name: string;
  unit_of_measure: string;
  selling_price_inr: number;
  configuration: string;
  specification: string;
}

export class CatalogMatchingService {
  /**
   * Matches an array of normalized line items against the canonical PostgreSQL catalog.
   */
  async matchLineItems(
    items: ExtractedLineItem[],
    city = 'Vijayawada'
  ): Promise<ExtractedLineItem[]> {
    // 1. Fetch reference catalog taxonomy
    const brandsRes = await db.query<CatalogBrand>('SELECT id, name FROM brands');
    const seriesRes = await db.query<CatalogSeries>('SELECT id, brand_id, name FROM brand_series');
    const skusRes = await db.query<CatalogSku>(`
      SELECT 
        s.id, s.sku_code, s.name, s.category_id, s.brand_id, b.name as brand_name,
        s.series_id, bs.name as series_name, s.unit_of_measure,
        s.selling_price_inr, s.configuration, s.specification
      FROM skus s
      JOIN brands b ON s.brand_id = b.id
      JOIN brand_series bs ON s.series_id = bs.id
      WHERE s.is_active = TRUE
    `);

    const brands = brandsRes.rows;
    const allSeries = seriesRes.rows;
    const allSkus = skusRes.rows;

    const matchedItems: ExtractedLineItem[] = [];

    for (const item of items) {
      const matched = await this.matchSingleItem(item, brands, allSeries, allSkus, city);
      matchedItems.push(matched);
    }

    return matchedItems;
  }

  private async matchSingleItem(
    item: ExtractedLineItem,
    brands: CatalogBrand[],
    allSeries: CatalogSeries[],
    allSkus: CatalogSku[],
    city: string
  ): Promise<ExtractedLineItem> {
    const text = item.normalizedText.toLowerCase();
    const evidence: MatchingEvidence = { reasons: [] };

    // -------------------------------------------------------------
    // Step 1: Detect Brand
    // -------------------------------------------------------------
    let detectedBrand: CatalogBrand | undefined;

    // Brand matching dictionary with common aliases
    const brandAliases: Record<string, string> = {
      anchor: 'Anchor by Panasonic',
      panasonic: 'Anchor by Panasonic',
      roma: 'Anchor by Panasonic',
      penta: 'Anchor by Panasonic',
      polycab: 'Polycab',
      poly: 'Polycab',
      flamex: 'Polycab',
      finolex: 'Finolex',
      finx: 'Finolex',
      frlsh: 'Finolex',
      schneider: 'Schneider Electric',
      acti9: 'Schneider Electric',
      havells: 'Havells',
      legrand: 'Legrand',
      arteor: 'Legrand',
      philips: 'Philips',
    };

    for (const [token, brandCanonicalName] of Object.entries(brandAliases)) {
      const regex = new RegExp(`\\b${token}\\b`, 'i');
      if (regex.test(text)) {
        detectedBrand = brands.find(
          (b) => b.name.toLowerCase() === brandCanonicalName.toLowerCase()
        );
        if (detectedBrand) {
          evidence.brandMatch = {
            brandName: detectedBrand.name,
            score: 1.0,
            sourceToken: token,
          };
          evidence.reasons.push(`Brand identified as '${detectedBrand.name}' via keyword '${token}'.`);
          break;
        }
      }
    }

    // -------------------------------------------------------------
    // Step 2: Detect Series
    // -------------------------------------------------------------
    let candidateSeries: CatalogSeries[] = [];
    let detectedSeries: CatalogSeries | undefined;

    if (detectedBrand) {
      candidateSeries = allSeries.filter((s) => s.brand_id === detectedBrand!.id);
    } else {
      candidateSeries = allSeries;
    }

    // Check if any series name or keywords appear explicitly
    for (const ser of candidateSeries) {
      const sName = ser.name.toLowerCase();
      // Test key distinct series words (e.g. "roma", "penta", "flamex", "acti9", "arteor", "stealth", "stellar")
      const words = sName.split(/\s+/).filter((w) => w.length > 3);
      for (const w of words) {
        const regex = new RegExp(`\\b${w}\\b`, 'i');
        if (regex.test(text)) {
          detectedSeries = ser;
          evidence.seriesMatch = {
            seriesName: ser.name,
            score: 1.0,
            sourceToken: w,
          };
          evidence.reasons.push(`Series identified as '${ser.name}' via keyword '${w}'.`);
          break;
        }
      }
      if (detectedSeries) break;
    }

    // -------------------------------------------------------------
    // Step 3: Extract Specifications (ratings, gauges, modules, poles)
    // -------------------------------------------------------------
    const specsDetected: string[] = [];

    // Gauges
    const gaugeMatch = text.match(/\b(0\.75|1\.0|1\.5|2\.5|4\.0|4|6\.0|6|10\.0|10)\s*(?:sq\.?\s*mm|sqmm)\b/i);
    const gauge = gaugeMatch ? `${parseFloat(gaugeMatch[1]).toFixed(1)} sq.mm` : undefined;
    if (gauge) specsDetected.push(`Gauge: ${gauge}`);

    // Ratings
    const ratingMatch = text.match(/\b(6|10|16|20|25|32|40|63)\s*a\b/i);
    const rating = ratingMatch ? `${ratingMatch[1]}A`.toUpperCase() : undefined;
    if (rating) specsDetected.push(`Rating: ${rating}`);

    // Modules
    const moduleMatch = text.match(/\b(1|2|3|4|6|8|12|18)[-\s]*(?:modules?|mods?|m)\b/i);
    const moduleNum = moduleMatch ? moduleMatch[1] : undefined;
    const modules = moduleNum ? `${moduleNum} Module` : undefined;
    if (modules) specsDetected.push(`Module: ${modules}`);

    // Poles
    const poleMatch = text.match(/\b(sp|dp|tp|4-pole|4\s*pole|30ma)\b/i);
    const pole = poleMatch ? poleMatch[1].toUpperCase() : undefined;
    if (pole) specsDetected.push(`Configuration: ${pole}`);

    // Colors
    const colorMatch = text.match(/\b(red|yellow|blue|green|black|white|magnesium)\b/i);
    const color = colorMatch ? colorMatch[1].toLowerCase() : undefined;
    if (color) specsDetected.push(`Color: ${color}`);

    // Product Type Classification
    const isPlate = /\bplates?\b/i.test(text);
    const isSwitch = /\bswitch(?:es)?\b/i.test(text);
    const isSocket = /\bsockets?\b/i.test(text);
    const isFan = /\bfans?\b/i.test(text);
    const isWire = /\b(?:wires?|cables?|coils?)\b/i.test(text);
    const isMcb = /\b(?:mcb|rccb|breaker|isolator)\b/i.test(text);

    evidence.specificationsDetected = specsDetected;

    // -------------------------------------------------------------
    // Step 4: Progressive SKU Candidate Filtering
    // -------------------------------------------------------------
    let candidates: CatalogSku[] = [];
    const hasCategoryOrType = isPlate || isSwitch || isSocket || isFan || isWire || isMcb;

    if (detectedBrand || detectedSeries || hasCategoryOrType) {
      candidates = allSkus;

      // Filter by Brand if detected
      if (detectedBrand) {
        candidates = candidates.filter((s) => s.brand_id === detectedBrand!.id);
      }

      // Filter by Series if detected
      if (detectedSeries) {
        candidates = candidates.filter((s) => s.series_id === detectedSeries!.id);
      }

      // Filter by Product Type
      if (isPlate) {
        candidates = candidates.filter(
          (s) => s.category_id === 'switches-sockets' && (s.name.toLowerCase().includes('plate') || s.sku_code.includes('PLT'))
        );
      } else if (isSwitch) {
        candidates = candidates.filter(
          (s) => s.category_id === 'switches-sockets' && (s.name.toLowerCase().includes('switch') || s.sku_code.includes('1W') || s.sku_code.includes('2W'))
        );
      } else if (isSocket) {
        candidates = candidates.filter(
          (s) => s.name.toLowerCase().includes('socket') || s.sku_code.includes('SKT') || s.sku_code.includes('16AS')
        );
      } else if (isFan) {
        candidates = candidates.filter((s) => s.category_id === 'fans' || s.name.toLowerCase().includes('fan'));
      } else if (isWire) {
        candidates = candidates.filter((s) => s.category_id === 'wires-cables');
      } else if (isMcb) {
        candidates = candidates.filter((s) => s.category_id === 'mcb-switchgear');
      }

      // Filter by Gauge if detected
      if (gauge) {
        candidates = candidates.filter(
          (s) =>
            (s.specification && s.specification.toLowerCase().includes(gauge.toLowerCase())) ||
            (s.configuration && s.configuration.toLowerCase().includes(gauge.toLowerCase())) ||
            (s.name && s.name.toLowerCase().includes(gauge.toLowerCase()))
        );
      }

      // Filter by Rating if detected
      if (rating) {
        candidates = candidates.filter(
          (s) =>
            (s.specification && s.specification.toUpperCase().includes(rating)) ||
            (s.configuration && s.configuration.toUpperCase().includes(rating)) ||
            (s.name && s.name.toUpperCase().includes(rating))
        );
      }

      // Filter by Module if detected
      if (moduleNum) {
        candidates = candidates.filter(
          (s) =>
            (s.specification && new RegExp(`\\b${moduleNum}\\s*module\\b`, 'i').test(s.specification)) ||
            (s.configuration && new RegExp(`\\b${moduleNum}\\s*module\\b`, 'i').test(s.configuration)) ||
            (s.name && new RegExp(`\\b${moduleNum}[-\\s]*module\\b`, 'i').test(s.name)) ||
            (s.sku_code && new RegExp(`-${moduleNum}M-`, 'i').test(s.sku_code))
        );
      }

      // Filter by Color if detected
      if (color) {
        candidates = candidates.filter(
          (s) =>
            (s.specification && s.specification.toLowerCase().includes(color)) ||
            (s.name && s.name.toLowerCase().includes(color))
        );
      }
    } else {
      // No brand, series, or product type keywords identified
      // Check full text token match against master catalog
      candidates = allSkus.filter((s) => {
        const skuTokens = s.name.toLowerCase().split(/\s+/);
        return skuTokens.filter((tok) => tok.length > 4 && text.includes(tok)).length >= 2;
      });
    }

    evidence.candidateCount = candidates.length;

    // -------------------------------------------------------------
    // Step 5: Exact SKU Match vs. Ambiguity / Clarification Decision
    // -------------------------------------------------------------
    let matchStatus: MatchStatus = 'NO_MATCH';
    let confidence: ConfidenceLevel = 'LOW';
    let confidenceScore = 0.2;
    let matchedSkuId: string | undefined;
    let matchedSkuCode: string | undefined;
    let productName: string | undefined;
    let unitPriceInr: number | undefined;
    let clarificationPrompt: string | undefined;
    let candidateOptions: CandidateOption[] | undefined;

    // RULE 1: EXACT MATCH
    // An exact match can ONLY be declared if exactly ONE catalog SKU qualifies
    // AND all required essential specs (brand + series/type) are verified.
    const requiresSeries = isSwitch || isSocket || isPlate || isMcb;
    const hasRequiredSeries = !requiresSeries || !!detectedSeries;

    if (
      candidates.length === 1 &&
      hasRequiredSeries &&
      (detectedSeries || (detectedBrand && specsDetected.length >= 1))
    ) {
      const best = candidates[0];
      matchStatus = 'EXACT_MATCH';
      confidence = 'HIGH';
      confidenceScore = 0.95;
      matchedSkuId = best.id;
      matchedSkuCode = best.sku_code;
      productName = best.name;
      unitPriceInr = parseFloat(String(best.selling_price_inr));
      evidence.reasons.push(
        `Exact SKU '${best.sku_code}' verified with zero ambiguity across brand, series, and specifications.`
      );
    }
    // RULE 2: AMBIGUOUS / NEEDS CLARIFICATION
    // Brand is known or partial keywords exist, but multiple series or models are plausible, OR essential series is missing.
    else if (
      candidates.length > 1 ||
      (detectedBrand && !detectedSeries && candidateSeries.length > 1) ||
      (candidates.length === 1 && !hasRequiredSeries)
    ) {
      matchStatus = (detectedBrand && !detectedSeries) ? 'NEEDS_CLARIFICATION' : (candidates.length > 1 ? 'AMBIGUOUS' : 'NEEDS_CLARIFICATION');
      confidence = 'MEDIUM';
      confidenceScore = 0.65;

      // Provide legitimate catalog candidate options for user clarification
      const plausibleSkus =
        candidates.length > 0
          ? candidates
          : allSkus.filter((s) => s.brand_id === detectedBrand?.id);

      candidateOptions = plausibleSkus.slice(0, 4).map((s) => ({
        sku: s.sku_code,
        name: s.name,
        brand: s.brand_name,
        series: s.series_name,
        specification: s.specification,
        price: parseFloat(String(s.selling_price_inr)),
        unit: s.unit_of_measure,
        inStock: true,
      }));

      // Formulate customer-facing clarification question
      if (detectedBrand && !detectedSeries) {
        const seriesNames = candidateSeries.map((s) => s.name).join(' vs ');
        clarificationPrompt = `Which series of ${detectedBrand.name} do you require (${seriesNames})?`;
      } else if (!rating && (text.includes('switch') || text.includes('mcb'))) {
        clarificationPrompt = `Please select current rating (e.g. 6A vs 16A) for this switch item.`;
      } else {
        clarificationPrompt = `Multiple catalog items match your description. Please choose the exact product.`;
      }

      evidence.reasons.push(
        `Ambiguous description with ${candidateOptions.length} plausible catalog options. Clarification required to prevent incorrect SKU selection.`
      );
    }
    // RULE 3: NO MATCH
    else {
      matchStatus = 'NO_MATCH';
      confidence = 'LOW';
      confidenceScore = 0.15;
      clarificationPrompt = `Could not find a matching product in the master catalog. Please verify brand, model or part number.`;
      evidence.reasons.push('No compatible product found in active master catalog.');
    }

    // -------------------------------------------------------------
    // Step 6: Hyperlocal Partner Inventory Verification
    // -------------------------------------------------------------
    let inventoryAvailable = false;
    let availableStock = 0;

    if (matchedSkuCode) {
      const invRes = await db.query<{ total_avail: string }>(
        `SELECT COALESCE(SUM(available_quantity), 0) as total_avail
         FROM partner_inventories
         WHERE sku_code = $1`,
        [matchedSkuCode]
      );
      availableStock = parseInt(invRes.rows[0]?.total_avail || '0', 10);
      inventoryAvailable = availableStock >= item.quantity;

      if (!inventoryAvailable) {
        evidence.reasons.push(
          `Local inventory shortage: requested ${item.quantity} units, available ${availableStock} units in ${city}.`
        );
        // If stock is completely 0 or severely deficient, note in status
        if (availableStock === 0) {
          matchStatus = 'UNAVAILABLE';
        }
      }
    }

    return {
      ...item,
      detectedBrand: detectedBrand?.name,
      detectedSeries: detectedSeries?.name,
      detectedConfig: [modules, pole].filter(Boolean).join(' ') || undefined,
      detectedSpec: specsDetected.join(', ') || undefined,
      confidence,
      confidenceScore,
      matchStatus,
      matchedSkuId: matchedSkuId || null,
      matchedSkuCode: matchedSkuCode || null,
      productName: productName || null,
      unitPriceInr: unitPriceInr !== undefined ? unitPriceInr : null,
      candidateOptions: candidateOptions || [],
      matchingEvidence: evidence,
      clarificationPrompt: clarificationPrompt || null,
      inventoryAvailable,
      availableStock,
    };
  }
}

export const catalogMatchingService = new CatalogMatchingService();
