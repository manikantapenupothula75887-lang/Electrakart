// ElectraKart Domain Data Models

export type UserRole = 'CUSTOMER' | 'RETAILER' | 'DISTRIBUTOR' | 'ADMIN';

export type PartnerType = 'RETAILER' | 'DISTRIBUTOR';

export type VerificationStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

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

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW';

export interface LocationCity {
  id: string;
  name: string;
  state: string;
  pincodePrefix: string;
  isAvailable: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  city: string;
  pincode: string;
  address?: string;
  partnerId?: string; // If Retailer or Distributor
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  itemCount: number;
  featuredBrands: string[];
}

export interface ProductBrand {
  id: string;
  name: string;
  origin: string;
  description: string;
  logoText: string;
  isPopular: boolean;
  series: string[];
}

export interface ProductSpecTable {
  [key: string]: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  productType: string;
  brand: string;
  series: string;
  model: string;
  configuration: string;
  specification: string;
  mrp: number;
  sellingPrice: number;
  hsnCode: string;
  gstPercent: number; // e.g. 18
  unit: string; // e.g. "Coil (90m)", "Nos", "Pcs", "Box (10 Nos)"
  isCertified: boolean;
  certificationNumber: string; // e.g. "IS 694 : 2010"
  warranty: string;
  description: string;
  specs: ProductSpecTable;
  imageUrl: string;
  inStockTotal: number;
  rating: number;
  reviewCount: number;
}

export interface NearbyStoreStock {
  partnerId: string;
  storeName: string;
  partnerType: PartnerType;
  city: string;
  distanceKm: number;
  deliveryEtaMin: number;
  stockCount: number;
  price: number;
  rating: number;
  address: string;
}

export interface PartnerInventoryItem {
  id: string;
  sku: string;
  productName: string;
  brand: string;
  series: string;
  category: string;
  inStock: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  priceReference: number; // Partner's selling price reference
  lastUpdated: string;
  partnerId: string;
}

export interface Partner {
  id: string;
  businessName: string;
  ownerName: string;
  type: PartnerType;
  city: string;
  state: string;
  pincode: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  bankAccount: string;
  bankIfsc: string;
  status: VerificationStatus;
  commissionRate: number; // percentage e.g. 5.5%
  deliveryRadiusKm: number;
  rating: number;
  totalOrdersFulfilled: number;
  brandsSold: string[];
  joinedDate: string;
  storePhoto?: string;
}

export interface Warehouse {
  id: string;
  partnerId: string;
  warehouseName: string;
  city: string;
  state: string;
  address: string;
  capacitySqFt: number;
  totalSkus: number;
  totalInventoryUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  reservedStockUnits: number;
  incomingStockUnits: number;
}

export interface EstimateExtractedItem {
  id: string;
  rawText: string;
  quantity: number;
  unit: string;
  detectedBrand: string;
  detectedSeries: string;
  detectedConfig: string;
  detectedSpec: string;
  confidence: ConfidenceLevel;
  reason: string;
  matchedProduct?: Product;
  possibleOptions?: {
    brand: string;
    series: string;
    specification: string;
    matchedSku: string;
    productName: string;
    price: number;
  }[];
}

export interface QuotationItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  series: string;
  specification: string;
  quantity: number;
  unit: string;
  rate: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string; // e.g. "EK-QUO-2026-9921"
  createdAt: string;
  validUntil: string; // 48 hrs locked price
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  city: string;
  pincode: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  gstTotal: number;
  grandTotal: number;
  isPriceLocked: boolean;
  status: 'LOCKED' | 'ACCEPTED' | 'ORDERED' | 'EXPIRED';
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedStore: NearbyStoreStock;
}

export interface FulfillmentItem {
  sku: string;
  name: string;
  brand: string;
  series: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

export interface OrderFulfillment {
  id: string;
  fulfillmentIndex: number;
  partnerId: string;
  partnerName: string;
  partnerType: PartnerType;
  partnerAddress: string;
  items: FulfillmentItem[];
  status: OrderStatus;
  eta: string;
  driverName?: string;
  driverPhone?: string;
  handoverOtp?: string;
  lastUpdated: string;
  trackingHistory: {
    status: OrderStatus;
    timestamp: string;
    title: string;
    description: string;
  }[];
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "EK-10025"
  createdAt: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  city: string;
  pincode: string;
  deliveryMethod: 'STANDARD' | 'EXPRESS' | 'PICKUP';
  fulfillments: OrderFulfillment[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  gstTotal: number;
  grandTotal: number;
  paymentMethod: 'UPI' | 'NET_BANKING' | 'TRADE_CREDIT' | 'COD';
  paymentStatus: 'PAID' | 'PENDING';
  overallStatus: OrderStatus;
}

export interface MasterCatalogMappingItem {
  id: string;
  rawTerm: string;
  retailerName: string;
  retailerId: string;
  suggestedSku: string;
  suggestedName: string;
  confidenceScore: number;
  status: 'MATCHED' | 'NEEDS_ADMIN_REVIEW' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
}

// Re-export full canonical domain and security models
export * from './domain';
export * from './security';

