# ElectraKart Hyperlocal Fulfillment & Inventory Engine

## 1. Engine Overview

The ElectraKart Hyperlocal Fulfillment Engine orchestrates the assignment of customer cart items to local electrical retailers, distributor hubs, and regional warehouses. It enforces server-authoritative assignment with deterministic multi-attribute scoring, strict inventory reservation row locking (`SELECT ... FOR UPDATE`), and zero financial leakage.

```
Customer Order / Cart
         │
         ▼
[Server-Authoritative Geocoding]
         │ (Customer Coordinates: lat, lng)
         ▼
[Partner Eligibility Filter]
  ├─ Status: ACTIVE & is_active = TRUE
  ├─ Distance ≤ service_radius_km
  └─ Available Stock (in_stock - reserved) ≥ requested_qty
         │
         ▼
[Deterministic Scoring & Split Minimization]
  ├─ Single-Partner Full Coverage Preference (Score Bonus: -50.0)
  ├─ Road / Geodesic Distance Weighting (Weight: 2.0/km)
  ├─ Stock Depth & Verification Bonus
  └─ Minimum Disjoint Split Cover (if single partner impossible)
         │
         ▼
[Authoritative Customer Dispatch Plan]
  ├─ Total Packages & Delivery Slots (Hyperlocal 2-Hr / Same-Day)
  ├─ Origin Store Names & Distance Badges (Road / Geodesic)
  └─ ZERO Wholesale / Dealer Margin Leakage
         │
         ▼
[Transactional Order Creation & Row Locking]
  ├─ Master Order Record (orders)
  ├─ Fulfillments (order_fulfillments)
  └─ Atomic Reservation (SELECT ... FOR UPDATE on partner_inventories)
```

---

## 2. Deterministic Scoring Function

When evaluating an eligible partner $P$ for candidate item set $I$, the candidate score is calculated as:

$$\text{Score}(P) = w_{\text{dist}} \cdot d(P, C) - B_{\text{coverage}} \cdot \mathbb{I}(\text{covers all items}) - B_{\text{verified}} \cdot \mathbb{I}(P\text{ is verified}) - w_{\text{stock}} \cdot \min_{i \in I}\left(\frac{\text{avail}(P, i)}{\text{req}(i)}\right)$$

Where:
- $d(P, C)$ is the distance in kilometers from partner $P$ to customer location $C$.
- $w_{\text{dist}} = 2.0$ (distance penalty weight).
- $B_{\text{coverage}} = 50.0$ (coverage bonus to strongly favor single-shipment deliveries over multiple splits).
- $B_{\text{verified}} = 5.0$ (verified merchant reliability bonus).
- $w_{\text{stock}} = 1.0$ (stock depth weight).

Lower score indicates a superior allocation candidate.

---

## 3. Split Minimization Algorithm

1. **Phase 1 (Single Partner Feasibility)**:
   The engine checks if any single eligible partner within their service radius can fulfill 100% of the requested line items and quantities.
   - If one or more single partners qualify, the one with the lowest score is selected (**Fixture B**). No order split occurs.
2. **Phase 2 (Minimum Disjoint Cover)**:
   If no single partner has all items in stock:
   - The engine uses a greedy exact cover search to find the minimum number of partners required to fulfill all items (**Fixture C**).
   - Items are allocated to the nearest partner holding sufficient stock.
3. **Phase 3 (Unserviceable Detection)**:
   If any line item cannot be fulfilled by any active partner within service radius:
   - The item is flagged in `unserviceable_items` with specific reasons (`OUT_OF_STOCK`, `OUT_OF_SERVICE_RADIUS`) (**Fixture F**).
   - The overall plan is marked `is_fulfillable = false`.

---

## 4. Preferred Partner Validation & Zero Client Trust

In the catalog UI, a customer may express a preference for a specific local shop.
- **Rule**: Client hints (`preferred_partner_id`) are never blindly trusted.
- **Validation**:
  - Preferred partner must exist in `partners` table.
  - Preferred partner must have `is_active = TRUE` and `status = 'ACTIVE'`.
  - Preferred partner must be within `service_radius_km` of the customer's delivery coordinates.
  - Preferred partner must hold sufficient available stock.
- **Enforcement**:
  - If a client sends a forged, out-of-radius, or inactive partner ID, the server authoritatively ignores it and assigns the optimal eligible partner (**Fixture H**).

---

## 5. Zero Financial Leakage Protection

Customer-facing DTOs (`CustomerFulfillmentPlanDto`, `CustomerFulfillmentPackageDto`) are strictly scrubbed:
- `wholesale_price_inr`: Omitted.
- `cost_price_inr`: Omitted.
- `platform_commission_rate`: Omitted.
- `dealer_margin_inr`: Omitted.
- `internal_notes`: Omitted.

Customer responses only contain public catalog retail prices (`selling_price_inr`), authorized discounts, and standard delivery fees.

---

## 6. Atomic Concurrency & Row Locking

To eliminate stock overselling under high concurrency:
- Stock reservations execute within a PostgreSQL transaction using `SELECT ... FOR UPDATE` row locks:
  ```sql
  SELECT id, in_stock_quantity, reserved_quantity, available_quantity 
  FROM partner_inventories 
  WHERE partner_id = $1 AND sku_code = $2 
  FOR UPDATE;
  ```
- If `(in_stock_quantity - reserved_quantity) < requested_quantity`, the transaction rolls back immediately with HTTP 409 Conflict.
- Verified under concurrent execution in **Fixture K**, ensuring `reserved_quantity <= in_stock_quantity` under all race conditions.
