/**
 * ElectraKart Domain Model Definitions
 * Primary Source of Truth for ElectraKart Production Entities
 */

// ============================================================================
// 1. IDENTITY, ROLES & ORGANIZATIONS
// ============================================================================

export type Role = 'CUSTOMER' | 'RETAILER' | 'DISTRIBUTOR' | 'ADMIN';

export type PartnerType = 'RETAILER' | 'DISTRIBUTOR';

export type VerificationStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface Address {
  id: string;
  recipientName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface User {
  id: string;
  email: string;
  phoneNumber: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Customer extends User {
  role: 'CUSTOMER';
  billingGstin?: string;
  tradeAccountType: 'HOMEOWNER' | 'ELECTRICIAN' | 'CONTRACTOR' | 'COMMERCIAL';
  addresses: Address[];
  creditLimitINR?: number;
}

export interface Partner {
  id: string;
  businessName: string;
  legalEntityName: string;
  ownerName: string;
  type: PartnerType;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  bankAccount: string;
  bankIfsc: string;
  status: VerificationStatus;
  
  /** @security Internal/Admin-Only - Never expose in Customer-facing UI/API */
  commissionRatePercent: number; // e.g. 5.5%

  deliveryRadiusKm: number;
  rating: number;
  totalOrdersFulfilled: number;
  brandsSold: string[];
  joinedDate: string;
  storePhotoUrl?: string;
  primaryAddress: Address;
}

export interface Retailer extends User {
  role: 'RETAILER';
  partnerId: string;
  storeId: string;
}

export interface Distributor extends User {
  role: 'DISTRIBUTOR';
  partnerId: string;
  warehouseIds: string[];
}

export interface Store {
  id: string;
  partnerId: string;
  storeName: string;
  address: Address;
  deliveryRadiusKm: number;
  isAcceptingOrders: boolean;
  contactPhone: string;
  operatingHours: string;
}

export interface Warehouse {
  id: string;
  partnerId: string;
  warehouseName: string;
  address: Address;
  capacitySqFt: number;
  totalSkusCount: number;
  totalInventoryUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  reservedStockUnits: number;
  incomingStockUnits: number;
  isActive: boolean;
}

// ============================================================================
// 2. PRODUCT MASTER & CANONICAL HIERARCHY
// ============================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  isActive: boolean;
  displayOrder: number;
}

export interface ProductType {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
}

export interface Brand {
  id: string;
  name: string;
  originCountry: string;
  description: string;
  logoUrl?: string;
  isPopular: boolean;
}

export interface Series {
  id: string;
  brandId: string;
  name: string;
  description: string;
}

export interface Model {
  id: string;
  seriesId: string;
  name: string;
  baseModelCode: string;
}

export interface Variant {
  id: string;
  modelId: string;
  color?: string;
  sweepMm?: number;
  finishType?: string;
}

export interface Specification {
  id: string;
  technicalSpecs: Record<string, string>; // e.g. {"Current": "16A", "Voltage": "1100V"}
  certificationStandard: string; // e.g. "IS 694 : 2010"
  warrantyPeriod: string;
}

export interface SKU {
  id: string;
  skuCode: string; // e.g. "POL-WX-25-RED-90M"
  name: string;
  hsnCode: string;
  categoryId: string;
  productTypeId: string;
  brandId: string;
  seriesId: string;
  modelId: string;
  variantId?: string;
  specificationId: string;
  unitOfMeasure: string; // e.g. "Coil (90m)", "Nos", "Pack (10)"
  mrpINR: number;
  gstRatePercent: number; // e.g. 18
  imageUrl: string;
  isCertified: boolean;
  certificationNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 3. INVENTORY & PRICING ENGINE
// ============================================================================

export type InventoryTransactionType =
  | 'INWARD_FACTORY'
  | 'RESERVATION_ORDER'
  | 'RELEASE_CANCELLED'
  | 'DISPATCH_FULFILLMENT'
  | 'TRANSFER_INTER_WAREHOUSE'
  | 'MANUAL_ADJUSTMENT';

export interface PartnerInventory {
  id: string;
  partnerId: string;
  skuId: string;
  skuCode: string;
  inStockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  
  /** @security Internal/Admin/Partner only */
  purchaseCostINR?: number;

  sellingPriceINR: number;
  lastUpdated: string;
}

export interface InventoryTransaction {
  id: string;
  inventoryId: string;
  partnerId: string;
  skuCode: string;
  transactionType: InventoryTransactionType;
  quantityChange: number; // positive or negative
  previousQuantity: number;
  newQuantity: number;
  referenceId?: string; // e.g. Order ID, Inward Invoice #
  notes?: string;
  createdAt: string;
  createdByUserId: string;
}

export interface PricingRule {
  id: string;
  skuId?: string;
  categoryId?: string;
  customerTier: 'RETAIL' | 'ELECTRICIAN_PRO' | 'CONTRACTOR_BULK';
  minQuantity: number;
  discountPercent: number;

  /** @security Internal/Admin-Only - Take rate & floor margins */
  minPlatformMarginPercent: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

// ============================================================================
// 4. ESTIMATES & QUOTATIONS
// ============================================================================

export type EstimateStatus =
  | 'UPLOADED'
  | 'ANALYZING'
  | 'NEEDS_REVIEW'
  | 'REVIEWED'
  | 'QUOTED'
  | 'ARCHIVED';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW';

export interface EstimateItem {
  id: string;
  estimateId: string;
  rawLineText: string;
  detectedQuantity: number;
  detectedUnit: string;
  detectedBrand?: string;
  detectedSeries?: string;
  detectedConfig?: string;
  detectedSpec?: string;
  confidence: ConfidenceLevel;
  confidenceScore: number; // 0.0 - 1.0
  reasonForReview?: string;
  matchedSkuId?: string;
  matchedSkuCode?: string;
  isResolvedByCustomer: boolean;
}

export interface Estimate {
  id: string;
  customerId?: string;
  documentUrl?: string;
  documentType?: 'IMAGE' | 'PDF' | 'TEXT_NOTE';
  rawTextPayload?: string;
  status: EstimateStatus;
  items: EstimateItem[];
  city: string;
  pincode: string;
  createdAt: string;
  updatedAt: string;
}

export type QuotationStatus = 'DRAFT' | 'LOCKED' | 'ACCEPTED' | 'ORDERED' | 'EXPIRED';

export interface QuotationItem {
  id: string;
  quotationId: string;
  skuId: string;
  skuCode: string;
  productName: string;
  brandName: string;
  seriesName: string;
  specificationDetails: string;
  quantity: number;
  unit: string;
  unitRateINR: number;
  gstRatePercent: number;
  gstAmountINR: number;
  lineTotalINR: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string; // e.g. "EK-QUO-2026-8841"
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  city: string;
  pincode: string;
  items: QuotationItem[];
  subtotalINR: number;
  discountINR: number;
  deliveryFeeINR: number;
  gstTotalINR: number;
  grandTotalINR: number;
  isPriceLocked: boolean;
  lockedUntilTimestamp: string; // 48 Hours validity guarantee
  status: QuotationStatus;
  createdAt: string;
}

// ============================================================================
// 5. ORDERS & SPLIT FULFILLMENT
// ============================================================================

export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PARTNER_ACCEPTED'
  | 'PREPARING'
  | 'PACKED'
  | 'DISPATCHED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type DeliveryMethod = 'STANDARD' | 'EXPRESS' | 'STORE_PICKUP';

export type PaymentMethod = 'UPI' | 'NET_BANKING' | 'TRADE_CREDIT' | 'COD';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface FulfillmentItem {
  skuId: string;
  skuCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPriceINR: number;
  lineTotalINR: number;
}

export interface FulfillmentTrackingLog {
  id: string;
  fulfillmentId: string;
  status: OrderStatus;
  title: string;
  description: string;
  timestamp: string;
}

export interface OrderFulfillment {
  id: string;
  orderId: string;
  fulfillmentIndex: number;
  partnerId: string;
  partnerName: string;
  partnerType: PartnerType;
  partnerAddress: string;
  items: FulfillmentItem[];
  status: OrderStatus;
  estimatedDeliveryTime: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  handoverOtp?: string;
  trackingHistory: FulfillmentTrackingLog[];
  lastUpdated: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  skuId: string;
  skuCode: string;
  productName: string;
  quantity: number;
  unitPriceINR: number;
  totalPriceINR: number;
  allocatedPartnerId: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "EK-10025"
  customerId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: Address;
  deliveryMethod: DeliveryMethod;
  fulfillments: OrderFulfillment[];
  subtotalINR: number;
  discountINR: number;
  deliveryFeeINR: number;
  gstTotalINR: number;
  grandTotalINR: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  overallStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 6. PAYMENTS & SETTLEMENTS
// ============================================================================

export interface Payment {
  id: string;
  orderId: string;
  amountINR: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  gatewayTransactionId?: string;
  paymentGatewayProvider: 'RAZORPAY_DEMO' | 'CASHFREE_DEMO' | 'MANUAL_CREDIT';
  gatewaySignature?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Settlement {
  id: string; // e.g. "SET-2026-W38"
  partnerId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  grossSalesINR: number;
  platformCommissionINR: number;
  tdsDeductedINR: number;
  netPayoutINR: number;
  status: 'PENDING' | 'PROCESSING' | 'SETTLED' | 'FAILED';
  bankUtrNumber?: string;
  disbursementDate?: string;
  gstCreditNoteInvoiceUrl?: string;
  createdAt: string;
}

// ============================================================================
// 7. NOTIFICATIONS, CHAT & REVIEWS
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  role: Role;
  title: string;
  message: string;
  type: 'ORDER_UPDATE' | 'PRICE_ALERT' | 'KYC_STATUS' | 'INVENTORY_LOW' | 'SYSTEM';
  isRead: boolean;
  linkActionUrl?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'ai' | 'user' | 'agent';
  text: string;
  timestamp: string;
  suggestedActionOptions?: string[];
  productPayload?: {
    skuCode: string;
    productName: string;
    priceINR: number;
    redirectUrl: string;
  };
}

export interface Review {
  id: string;
  skuId: string;
  customerId: string;
  customerName: string;
  isVerifiedContractor: boolean;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  createdAt: string;
}
