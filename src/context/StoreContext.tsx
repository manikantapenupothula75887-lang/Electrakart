import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  Product,
  CartItem,
  NearbyStoreStock,
  EstimateExtractedItem,
  Quotation,
  Order,
  OrderStatus,
  Partner,
  Warehouse,
  PartnerInventoryItem,
  MasterCatalogMappingItem,
} from '../types';
import {
  PRODUCTS_DATA,
  CATEGORIES_DATA,
  BRANDS_DATA,
  NEARBY_STORES_DATA,
  PARTNERS_DATA,
  WAREHOUSES_DATA,
  INITIAL_ORDERS,
  INITIAL_MAPPING_QUEUE,
  SAMPLE_ESTIMATES,
} from '../data/mockData';
import {
  authService,
  productService,
  inventoryService,
  pricingService,
  estimateService,
  quotationService,
  cartService,
  orderService,
  partnerService,
  warehouseService,
  notificationService,
  checkBackendHealth,
} from '../services';

interface StoreContextType {
  // Session & Persona
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentCity: string;
  setCurrentCity: (city: string) => void;
  pincode: string;
  setPincode: (pin: string) => void;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
  isBackendLive: boolean;

  // Catalog
  products: Product[];
  getProductById: (id: string) => Product | undefined;
  getProductBySku: (sku: string) => Product | undefined;
  getNearbyStockForProduct: (productId: string) => NearbyStoreStock[];
  addMasterProduct: (product: Omit<Product, 'id'>) => Product;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, customStore?: NearbyStoreStock) => void;
  removeFromCart: (sku: string) => void;
  updateCartQuantity: (sku: string, quantity: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartGstTotal: number;
  cartDeliveryFee: number;
  cartGrandTotal: number;
  cartFulfillmentsCount: number;

  // AI Estimate & Quotations
  currentEstimateItems: EstimateExtractedItem[];
  isProcessingEstimate: boolean;
  estimateStage: string;
  startEstimateAnalysis: (sampleId?: string, rawText?: string) => Promise<void>;
  resolveEstimateItem: (itemId: string, selectedMatch: { sku: string; brand: string; series: string; spec: string }) => void;
  addManualEstimateItem: (rawText: string, qty: number) => void;
  removeEstimateItem: (itemId: string) => void;
  quotations: Quotation[];
  createQuotationFromEstimate: (customerName?: string, customerPhone?: string, address?: string) => Quotation;
  acceptQuotation: (quotationId: string) => void;

  // Orders & Multi-store fulfillments
  orders: Order[];
  placeOrder: (details: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    city: string;
    pincode: string;
    deliveryMethod: 'STANDARD' | 'EXPRESS' | 'PICKUP';
    paymentMethod: 'UPI' | 'NET_BANKING' | 'TRADE_CREDIT' | 'COD';
  }) => Order;
  updateFulfillmentStatus: (orderId: string, fulfillmentId: string, status: OrderStatus, note?: string) => void;

  // Retailer
  retailerInventory: PartnerInventoryItem[];
  adjustRetailerStock: (sku: string, delta: number) => void;
  importBulkInventory: (items: { sku: string; name: string; brand: string; stock: number; price: number }[]) => void;

  // Distributor
  warehouses: Warehouse[];
  transferWarehouseStock: (fromWhId: string, toWhId: string, skuName: string, quantity: number) => void;

  // Admin
  partners: Partner[];
  updatePartnerStatus: (
    partnerId: string,
    status: Partner['status'],
    commissionRate?: number,
    deliveryRadiusKm?: number
  ) => void;
  registerNewPartner: (partnerData: Partial<Partner>) => Partner;
  mappingQueue: MasterCatalogMappingItem[];
  resolveMappingQueueItem: (id: string, status: 'APPROVED' | 'REJECTED', approvedSku?: string) => void;

  // Production Service Layer
  services: {
    auth: typeof authService;
    product: typeof productService;
    inventory: typeof inventoryService;
    pricing: typeof pricingService;
    estimate: typeof estimateService;
    quotation: typeof quotationService;
    cart: typeof cartService;
    order: typeof orderService;
    partner: typeof partnerService;
    warehouse: typeof warehouseService;
    notification: typeof notificationService;
  };
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persona State
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('electrakart_role') as UserRole) || 'CUSTOMER';
  });

  const [currentCity, setCurrentCity] = useState<string>('Vijayawada');
  const [pincode, setPincode] = useState<string>('520002');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  // Catalog
  const [products, setProducts] = useState<Product[]>(PRODUCTS_DATA);

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('electrakart_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Estimate State
  const [currentEstimateItems, setCurrentEstimateItems] = useState<EstimateExtractedItem[]>([]);
  const [isProcessingEstimate, setIsProcessingEstimate] = useState<boolean>(false);
  const [estimateStage, setEstimateStage] = useState<string>('');

  // Quotations
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    const saved = localStorage.getItem('electrakart_quotations');
    return saved ? JSON.parse(saved) : [];
  });

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('electrakart_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  // Retailer Inventory
  const [retailerInventory, setRetailerInventory] = useState<PartnerInventoryItem[]>([
    {
      id: 'inv-1',
      sku: 'POL-WX-25-RED-90M',
      productName: 'Polycab FlameX FR 2.5 sq.mm Red (90m)',
      brand: 'Polycab',
      series: 'FlameX FR',
      category: 'Wires & Cables',
      inStock: 14,
      reserved: 3,
      available: 11,
      lowStockThreshold: 5,
      priceReference: 3100,
      lastUpdated: 'Today, 14:15',
      partnerId: 'partner-vja-elec-1',
    },
    {
      id: 'inv-2',
      sku: 'POL-WX-15-YEL-90M',
      productName: 'Polycab FlameX FR 1.5 sq.mm Yellow (90m)',
      brand: 'Polycab',
      series: 'FlameX FR',
      category: 'Wires & Cables',
      inStock: 25,
      reserved: 2,
      available: 23,
      lowStockThreshold: 6,
      priceReference: 1980,
      lastUpdated: 'Today, 12:30',
      partnerId: 'partner-vja-elec-1',
    },
    {
      id: 'inv-3',
      sku: 'ANC-ROM-6M-PLT-WHT',
      productName: 'Anchor Roma Classic 6-Module Plate White',
      brand: 'Anchor',
      series: 'Roma Classic',
      category: 'Switches & Sockets',
      inStock: 45,
      reserved: 6,
      available: 39,
      lowStockThreshold: 10,
      priceReference: 185,
      lastUpdated: 'Yesterday',
      partnerId: 'partner-vja-elec-1',
    },
    {
      id: 'inv-4',
      sku: 'ANC-PEN-6A1W-WHT',
      productName: 'Anchor Penta 6A 1-Way Switch White (Box 20)',
      brand: 'Anchor',
      series: 'Penta',
      category: 'Switches & Sockets',
      inStock: 18,
      reserved: 0,
      available: 18,
      lowStockThreshold: 5,
      priceReference: 420,
      lastUpdated: '3 days ago',
      partnerId: 'partner-vja-elec-1',
    },
    {
      id: 'inv-5',
      sku: 'SCH-ACT-16A-SP',
      productName: 'Schneider Acti9 xC60 16A SP MCB',
      brand: 'Schneider',
      series: 'Acti9 xC60',
      category: 'MCBs & Protection',
      inStock: 8,
      reserved: 0,
      available: 8,
      lowStockThreshold: 10, // low stock flag
      priceReference: 295,
      lastUpdated: 'Today, 09:00',
      partnerId: 'partner-vja-elec-1',
    },
  ]);

  // Warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>(WAREHOUSES_DATA);

  // Partners
  const [partners, setPartners] = useState<Partner[]>(PARTNERS_DATA);

  // Mapping Queue
  const [mappingQueue, setMappingQueue] = useState<MasterCatalogMappingItem[]>(INITIAL_MAPPING_QUEUE);

  // PostgreSQL Backend Connectivity State
  const [isBackendLive, setIsBackendLive] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function initFromBackend() {
      try {
        const health = await checkBackendHealth();
        if (health.ok) {
          if (isMounted) setIsBackendLive(true);
          const liveProducts = await productService.getProducts();
          if (isMounted && liveProducts && liveProducts.length > 0) {
            setProducts(liveProducts);
          }
          const liveOrders = await orderService.getOrders();
          if (isMounted && liveOrders && liveOrders.length > 0) {
            setOrders(liveOrders);
          }
          const liveInv = await inventoryService.getRetailerInventory();
          if (isMounted && liveInv && liveInv.length > 0) {
            setRetailerInventory(liveInv);
          }
          const liveWh = await warehouseService.getWarehouses();
          if (isMounted && liveWh && liveWh.length > 0) {
            setWarehouses(liveWh);
          }
          const liveQueue = await productService.getMappingQueue();
          if (isMounted && liveQueue && liveQueue.length > 0) {
            setMappingQueue(liveQueue);
          }
        }
      } catch (err) {
        console.warn('[StoreContext] Running with offline/demo state:', err);
      }
    }
    initFromBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist role, cart, orders, quotes
  useEffect(() => {
    localStorage.setItem('electrakart_role', userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem('electrakart_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('electrakart_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('electrakart_quotations', JSON.stringify(quotations));
  }, [quotations]);

  // Catalog Helpers
  const getProductById = (id: string) => products.find((p) => p.id === id);
  const getProductBySku = (sku: string) => products.find((p) => p.sku === sku);

  const getNearbyStockForProduct = (productId: string): NearbyStoreStock[] => {
    if (NEARBY_STORES_DATA[productId]) {
      return NEARBY_STORES_DATA[productId];
    }
    // Fallback realistic store availability for any other demo product
    return [
      {
        partnerId: 'partner-vja-elec-1',
        storeName: 'Vijayawada Electricals & Hardware',
        partnerType: 'RETAILER',
        city: 'Vijayawada',
        distanceKm: 2.5,
        deliveryEtaMin: 45,
        stockCount: 15,
        price: 3100,
        rating: 4.9,
        address: 'Besant Road, Governorpet, Vijayawada',
      },
      {
        partnerId: 'dist-abc-vja-hub',
        storeName: 'ABC Electrical Distributors Central Hub',
        partnerType: 'DISTRIBUTOR',
        city: 'Vijayawada',
        distanceKm: 8.2,
        deliveryEtaMin: 90,
        stockCount: 65,
        price: 3050,
        rating: 5.0,
        address: 'Auto Nagar Phase 2, Vijayawada',
      },
    ];
  };

  const addMasterProduct = (newProd: Omit<Product, 'id'>): Product => {
    const created: Product = {
      ...newProd,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [created, ...prev]);
    return created;
  };

  // Cart operations
  const addToCart = (product: Product, quantity = 1, customStore?: NearbyStoreStock) => {
    const nearbyStores = getNearbyStockForProduct(product.id);
    const store = customStore || nearbyStores[0];

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.sku === product.sku);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      }
      return [
        ...prev,
        {
          product,
          quantity,
          selectedStore: store,
        },
      ];
    });
  };

  const removeFromCart = (sku: string) => {
    setCart((prev) => prev.filter((item) => item.product.sku !== sku));
  };

  const updateCartQuantity = (sku: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(sku);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.sku === sku ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setCart([]);

  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.sellingPrice * item.quantity, 0);
  const cartGstTotal = Math.round(cartSubtotal * 0.18);
  const cartDeliveryFee = cartSubtotal > 5000 ? 0 : 150;
  const cartGrandTotal = cartSubtotal + cartGstTotal + cartDeliveryFee;

  // Unique fulfillment store count
  const cartFulfillmentsCount = new Set(cart.map((item) => item.selectedStore.partnerId)).size;

  // AI Estimate Processing Simulation
  const startEstimateAnalysis = async (sampleId?: string, rawCustomText?: string) => {
    setIsProcessingEstimate(true);
    const stages = [
      'Reading Estimate Document...',
      'Extracting Line Items & Quantities...',
      'Identifying Brands & Product Categories...',
      'Matching Series & Configurations...',
      'Resolving Electrical Specifications...',
      'Checking Nearby Inventory Availability...',
      'Calculating Locked Guaranteed Pricing...',
      'Synthesizing Official Quotation...',
    ];

    for (let i = 0; i < stages.length; i++) {
      setEstimateStage(stages[i]);
      // Small realistic pause
      await new Promise((r) => setTimeout(r, 450));
    }

    // Determine items based on sample or custom
    let extracted: EstimateExtractedItem[] = [];
    if (sampleId === 'estimate-sample-2') {
      // Commercial sample
      extracted = [
        {
          id: 'ext-c1',
          rawText: 'Finolex FRLSH 1.5 sq mm blue wire - 6 Coils',
          quantity: 6,
          unit: 'Coil (90m)',
          detectedBrand: 'Finolex',
          detectedSeries: 'FRLSH Flame Retardant',
          detectedConfig: '1.5 sq.mm',
          detectedSpec: 'Low Smoke Halogen, Blue',
          confidence: 'HIGH',
          reason: 'Brand, wire gauge (1.5), series (FRLSH) and color exactly specified in bill.',
          matchedProduct: products.find((p) => p.sku === 'FIN-FRL-15-BLU-90M'),
        },
        {
          id: 'ext-c2',
          rawText: 'Finolex 4.0 sq mm green earth wire - 2 Coils',
          quantity: 2,
          unit: 'Coil (90m)',
          detectedBrand: 'Finolex',
          detectedSeries: 'FRLSH Flame Retardant',
          detectedConfig: '4.0 sq.mm',
          detectedSpec: 'Single Core, 28A Heavy Load',
          confidence: 'HIGH',
          reason: 'Exact wire gauge matched to heavy appliance earth circuit.',
          matchedProduct: products.find((p) => p.sku === 'FIN-FRL-40-GRN-90M'),
        },
        {
          id: 'ext-c3',
          rawText: 'Anchor Roma 8 module plate - 8 Nos',
          quantity: 8,
          unit: 'Nos',
          detectedBrand: 'Anchor',
          detectedSeries: 'Roma Classic',
          detectedConfig: '8 Module',
          detectedSpec: '8 Module Rectangular Grid',
          confidence: 'HIGH',
          reason: 'Standard 8-module modular plate matched.',
          matchedProduct: products.find((p) => p.sku === 'ANC-ROM-8M-PLT-WHT'),
        },
        {
          id: 'ext-c4',
          rawText: 'Anchor Roma 6A 1-way modular switch - 40 Nos',
          quantity: 4, // 4 packs of 10
          unit: 'Pack (10 Nos)',
          detectedBrand: 'Anchor',
          detectedSeries: 'Roma Classic',
          detectedConfig: '1 Module',
          detectedSpec: '6A 240V AC 1-Way Modular',
          confidence: 'HIGH',
          reason: 'Pack of 10s calculated from 40 loose switch requirement.',
          matchedProduct: products.find((p) => p.sku === 'ANC-ROM-6A1W-WHT'),
        },
        {
          id: 'ext-c5',
          rawText: 'Philips 15W round LED panel light - 12 Nos',
          quantity: 12,
          unit: 'Nos',
          detectedBrand: 'Philips',
          detectedSeries: 'Stellar LED',
          detectedConfig: '15 Watt Round',
          detectedSpec: 'Warm White 3000K, 1350 Lumens',
          confidence: 'HIGH',
          reason: 'Philips 15W downlight matched directly.',
          matchedProduct: products.find((p) => p.sku === 'PHI-STL-15W-WW'),
        },
        {
          id: 'ext-c6',
          rawText: 'Schneider Acti9 16A MCB - 10 Nos',
          quantity: 10,
          unit: 'Nos',
          detectedBrand: 'Schneider',
          detectedSeries: 'Acti9 xC60',
          detectedConfig: 'Single Pole (SP)',
          detectedSpec: '16A, C-Curve, 10kA',
          confidence: 'HIGH',
          reason: 'Acti9 industrial protection MCB verified in master catalog.',
          matchedProduct: products.find((p) => p.sku === 'SCH-ACT-16A-SP'),
        },
      ];
    } else {
      // Default residential sample (with intentional disambiguation items as per spec!)
      extracted = [
        {
          id: 'ext-r1',
          rawText: 'Polycab 2.5 sq mm red wire - 3 Coils',
          quantity: 3,
          unit: 'Coil (90m)',
          detectedBrand: 'Polycab',
          detectedSeries: 'FlameX FR',
          detectedConfig: '2.5 sq.mm',
          detectedSpec: 'Single Core Red, 1100V, Class 5 Copper',
          confidence: 'HIGH',
          reason: 'Brand, gauge and color unequivocally matched.',
          matchedProduct: products.find((p) => p.sku === 'POL-WX-25-RED-90M'),
        },
        {
          id: 'ext-r2',
          rawText: 'Polycab 1.5 sq mm yellow wire - 2 Coils',
          quantity: 2,
          unit: 'Coil (90m)',
          detectedBrand: 'Polycab',
          detectedSeries: 'FlameX FR',
          detectedConfig: '1.5 sq.mm',
          detectedSpec: 'Single Core Yellow, 1100V',
          confidence: 'HIGH',
          reason: '1.5 sq.mm lighting circuit standard.',
          matchedProduct: products.find((p) => p.sku === 'POL-WX-15-YEL-90M'),
        },
        {
          // Disambiguation item requested by user specification!
          id: 'ext-r3',
          rawText: 'Anchor 6-9 switch - 20 Nos',
          quantity: 20,
          unit: 'Nos',
          detectedBrand: 'Anchor',
          detectedSeries: 'Not Specified (Penta vs Roma)',
          detectedConfig: '6 Module / Standard',
          detectedSpec: '6A 1-Way',
          confidence: 'MEDIUM',
          reason: 'Brand identified but series not specified: could be traditional Penta or modular Roma.',
          possibleOptions: [
            {
              brand: 'Anchor',
              series: 'Roma Classic (Modular)',
              specification: '6A 1-Way Modular Switch (Smooth Rocker)',
              matchedSku: 'ANC-ROM-6A1W-WHT',
              productName: 'Anchor Roma Classic 6A 1-Way Modular Switch (Pack of 10)',
              price: 460,
            },
            {
              brand: 'Anchor',
              series: 'Penta (Traditional Piano)',
              specification: '6A 1-Way Piano Switch (Box of 20)',
              matchedSku: 'ANC-PEN-6A1W-WHT',
              productName: 'Anchor Penta 6A 1-Way Piano Switch White (Box of 20)',
              price: 420,
            },
          ],
        },
        {
          id: 'ext-r4',
          rawText: 'Anchor Roma 6 module plate with frame - 6 Nos',
          quantity: 6,
          unit: 'Nos',
          detectedBrand: 'Anchor',
          detectedSeries: 'Roma Classic',
          detectedConfig: '6 Module',
          detectedSpec: 'UV Stabilized Gloss White Frame',
          confidence: 'HIGH',
          reason: '6-Module modular plate identified.',
          matchedProduct: products.find((p) => p.sku === 'ANC-ROM-6M-PLT-WHT'),
        },
        {
          id: 'ext-r5',
          rawText: 'Legrand 16A shutter socket - 4 Nos',
          quantity: 4,
          unit: 'Nos',
          detectedBrand: 'Legrand',
          detectedSeries: 'Arteor',
          detectedConfig: '2 Module',
          detectedSpec: '16A Universal 3-Pin Shuttered',
          confidence: 'HIGH',
          reason: 'Arteor 16A safety socket matched.',
          matchedProduct: products.find((p) => p.sku === 'LEG-ART-16AS-MG'),
        },
        {
          id: 'ext-r6',
          rawText: 'Havells 1200mm ceiling fan - 3 Nos',
          quantity: 3,
          unit: 'Nos',
          detectedBrand: 'Havells',
          detectedSeries: 'Stealth Air',
          detectedConfig: '1200mm Sweep',
          detectedSpec: 'BEE 5-Star BLDC, RF Remote',
          confidence: 'HIGH',
          reason: 'Energy efficient BLDC fan matched.',
          matchedProduct: products.find((p) => p.sku === 'HAV-STL-1200-BLU'),
        },
        {
          id: 'ext-r7',
          rawText: 'Schneider 16A SP MCB - 6 Nos',
          quantity: 6,
          unit: 'Nos',
          detectedBrand: 'Schneider',
          detectedSeries: 'Acti9 xC60',
          detectedConfig: 'Single Pole',
          detectedSpec: '16A C-Curve 10kA',
          confidence: 'HIGH',
          reason: 'Matched to Acti9 16A single pole breaker.',
          matchedProduct: products.find((p) => p.sku === 'SCH-ACT-16A-SP'),
        },
        {
          id: 'ext-r8',
          rawText: 'Polycab 63A 4 pole 30mA RCCB - 1 No',
          quantity: 1,
          unit: 'Nos',
          detectedBrand: 'Polycab',
          detectedSeries: 'ProSafe RCCB',
          detectedConfig: '4 Pole',
          detectedSpec: '63A 415V, 30mA Human Protection',
          confidence: 'HIGH',
          reason: 'Matched to 3-phase human shock safety circuit breaker.',
          matchedProduct: products.find((p) => p.sku === 'POL-RCCB-63A-4P30'),
        },
      ];
    }

    setCurrentEstimateItems(extracted);
    setIsProcessingEstimate(false);
  };

  const resolveEstimateItem = (
    itemId: string,
    selectedMatch: { sku: string; brand: string; series: string; spec: string }
  ) => {
    const prod = products.find((p) => p.sku === selectedMatch.sku);
    setCurrentEstimateItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            confidence: 'HIGH',
            detectedBrand: selectedMatch.brand,
            detectedSeries: selectedMatch.series,
            detectedSpec: selectedMatch.spec,
            matchedProduct: prod,
            reason: `Resolved by customer: Chosen ${selectedMatch.brand} ${selectedMatch.series} (${selectedMatch.sku})`,
          };
        }
        return item;
      })
    );
  };

  const addManualEstimateItem = (rawText: string, qty: number) => {
    const newItem: EstimateExtractedItem = {
      id: `ext-manual-${Date.now()}`,
      rawText,
      quantity: qty,
      unit: 'Nos',
      detectedBrand: 'Anchor',
      detectedSeries: 'Roma Classic',
      detectedConfig: 'Standard',
      detectedSpec: 'Manual Addition',
      confidence: 'HIGH',
      reason: 'Manually added by customer.',
      matchedProduct: products[0],
    };
    setCurrentEstimateItems((prev) => [...prev, newItem]);
  };

  const removeEstimateItem = (itemId: string) => {
    setCurrentEstimateItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const createQuotationFromEstimate = (
    customerName = 'Anil Kumar Reddy',
    customerPhone = '+91 98481 99882',
    address = 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada'
  ): Quotation => {
    const qItems = currentEstimateItems.map((estItem, index) => {
      const prod = estItem.matchedProduct || products[0];
      const rate = prod.sellingPrice;
      const totalAmount = rate * estItem.quantity;
      const gstAmount = Math.round(totalAmount * 0.18);
      return {
        id: `q-item-${index + 1}`,
        sku: prod.sku,
        name: prod.name,
        brand: prod.brand,
        series: prod.series,
        specification: estItem.detectedSpec || prod.specification,
        quantity: estItem.quantity,
        unit: estItem.unit || prod.unit,
        rate,
        gstPercent: 18,
        gstAmount,
        totalAmount: totalAmount + gstAmount,
      };
    });

    const subtotal = qItems.reduce((acc, it) => acc + it.rate * it.quantity, 0);
    const gstTotal = Math.round(subtotal * 0.18);
    const discount = subtotal > 20000 ? 1200 : 0;
    const deliveryFee = 0; // Free for estimate quotation
    const grandTotal = subtotal + gstTotal - discount + deliveryFee;

    const now = new Date();
    const expiry = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 Hours Locked Price

    const newQuotation: Quotation = {
      id: `quo-${Date.now()}`,
      quotationNumber: `EK-QUO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      validUntil: expiry.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      customerName,
      customerPhone,
      deliveryAddress: address,
      city: currentCity,
      pincode,
      items: qItems,
      subtotal,
      discount,
      deliveryFee,
      gstTotal,
      grandTotal,
      isPriceLocked: true,
      status: 'LOCKED',
    };

    setQuotations((prev) => [newQuotation, ...prev]);
    return newQuotation;
  };

  const acceptQuotation = (quotationId: string) => {
    setQuotations((prev) =>
      prev.map((q) => (q.id === quotationId ? { ...q, status: 'ACCEPTED' } : q))
    );
    const quote = quotations.find((q) => q.id === quotationId);
    if (quote) {
      // Transfer items to cart
      quote.items.forEach((item) => {
        const prod = products.find((p) => p.sku === item.sku) || products[0];
        addToCart(prod, item.quantity);
      });
    }
  };

  // Orders & Multi-store placement
  const placeOrder = (details: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    city: string;
    pincode: string;
    deliveryMethod: 'STANDARD' | 'EXPRESS' | 'PICKUP';
    paymentMethod: 'UPI' | 'NET_BANKING' | 'TRADE_CREDIT' | 'COD';
  }): Order => {
    const orderNum = `EK-${Math.floor(10000 + Math.random() * 90000)}`;

    // Group cart items by partner
    const grouped = new Map<string, CartItem[]>();
    cart.forEach((item) => {
      const partnerId = item.selectedStore.partnerId;
      if (!grouped.has(partnerId)) {
        grouped.set(partnerId, []);
      }
      grouped.get(partnerId)!.push(item);
    });

    const fulfillments = Array.from(grouped.entries()).map(([partnerId, items], idx) => {
      const partner =
        partners.find((p) => p.id === partnerId) || {
          businessName: items[0].selectedStore.storeName,
          type: items[0].selectedStore.partnerType,
          address: items[0].selectedStore.address,
        };

      return {
        id: `ful-${Date.now()}-${idx + 1}`,
        fulfillmentIndex: idx + 1,
        partnerId,
        partnerName: partner.businessName,
        partnerType: partner.type,
        partnerAddress: partner.address,
        items: items.map((i) => ({
          sku: i.product.sku,
          name: i.product.name,
          brand: i.product.brand,
          series: i.product.series,
          quantity: i.quantity,
          unitPrice: i.product.sellingPrice,
          unit: i.product.unit,
        })),
        status: 'CONFIRMED' as OrderStatus,
        eta: idx === 0 ? '30–45 mins' : '45–60 mins',
        handoverOtp: `${Math.floor(1000 + Math.random() * 9000)}`,
        lastUpdated: 'Just now',
        trackingHistory: [
          {
            status: 'PLACED' as OrderStatus,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: 'Order Placed',
            description: `Paid via ${details.paymentMethod}`,
          },
          {
            status: 'CONFIRMED' as OrderStatus,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: 'Store Assigned',
            description: `Allocated to ${partner.businessName}`,
          },
        ],
      };
    });

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      createdAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      customerName: details.customerName,
      customerPhone: details.customerPhone,
      deliveryAddress: details.deliveryAddress,
      city: details.city,
      pincode: details.pincode,
      deliveryMethod: details.deliveryMethod,
      fulfillments,
      subtotal: cartSubtotal,
      discount: cartSubtotal > 10000 ? 500 : 0,
      deliveryFee: cartDeliveryFee,
      gstTotal: cartGstTotal,
      grandTotal: cartGrandTotal,
      paymentMethod: details.paymentMethod,
      paymentStatus: 'PAID',
      overallStatus: 'CONFIRMED',
    };

    setOrders((prev) => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  const updateFulfillmentStatus = (
    orderId: string,
    fulfillmentId: string,
    status: OrderStatus,
    note?: string
  ) => {
    // Also record status change in orderService
    orderService.updateFulfillmentStatus(orderId, fulfillmentId, status, note).catch(console.error);

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const updatedFulfillments = order.fulfillments.map((ful) => {
          if (ful.id !== fulfillmentId) return ful;

          const newHistory = [
            ...ful.trackingHistory,
            {
              status,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              title: `Status: ${status.replace('_', ' ')}`,
              description: note || `Updated by partner ${ful.partnerName}`,
            },
          ];

          return {
            ...ful,
            status,
            lastUpdated: 'Just now',
            trackingHistory: newHistory,
          };
        });

        // Compute overall order status
        const allDelivered = updatedFulfillments.every((f) => f.status === 'DELIVERED');
        const anyActive = updatedFulfillments.some((f) => f.status !== 'DELIVERED');
        const overall = allDelivered ? 'DELIVERED' : status;

        return {
          ...order,
          overallStatus: overall,
          fulfillments: updatedFulfillments,
        };
      })
    );
  };

  // Retailer Inventory actions
  const adjustRetailerStock = (sku: string, delta: number) => {
    setRetailerInventory((prev) =>
      prev.map((item) => {
        if (item.sku === sku) {
          const newStock = Math.max(0, item.inStock + delta);
          return {
            ...item,
            inStock: newStock,
            available: Math.max(0, newStock - item.reserved),
            lastUpdated: 'Just now',
          };
        }
        return item;
      })
    );
  };

  const importBulkInventory = (
    items: { sku: string; name: string; brand: string; stock: number; price: number }[]
  ) => {
    const newItems: PartnerInventoryItem[] = items.map((it, idx) => ({
      id: `inv-bulk-${Date.now()}-${idx}`,
      sku: it.sku,
      productName: it.name,
      brand: it.brand,
      series: 'Standard',
      category: 'General Electricals',
      inStock: it.stock,
      reserved: 0,
      available: it.stock,
      lowStockThreshold: 10,
      priceReference: it.price,
      lastUpdated: 'Just imported',
      partnerId: 'partner-vja-elec-1',
    }));
    setRetailerInventory((prev) => [...newItems, ...prev]);
  };

  // Distributor actions
  const transferWarehouseStock = (
    fromWhId: string,
    toWhId: string,
    skuName: string,
    quantity: number
  ) => {
    warehouseService
      .transferStock({
        sourceWarehouseId: fromWhId,
        destinationWarehouseId: toWhId,
        sku: skuName,
        quantity,
      })
      .catch(console.error);

    setWarehouses((prev) =>
      prev.map((wh) => {
        if (wh.id === fromWhId) {
          return {
            ...wh,
            totalInventoryUnits: Math.max(0, wh.totalInventoryUnits - quantity),
          };
        }
        if (wh.id === toWhId) {
          return {
            ...wh,
            totalInventoryUnits: wh.totalInventoryUnits + quantity,
            incomingStockUnits: wh.incomingStockUnits + quantity,
          };
        }
        return wh;
      })
    );
  };

  // Admin actions
  const updatePartnerStatus = (
    partnerId: string,
    status: Partner['status'],
    commissionRate?: number,
    deliveryRadiusKm?: number
  ) => {
    partnerService.updatePartnerStatus(partnerId, status).catch(console.error);
    if (commissionRate !== undefined) {
      partnerService.updateCommissionRate(partnerId, commissionRate).catch(console.error);
    }
    if (deliveryRadiusKm !== undefined) {
      partnerService.updateDeliveryRadius(partnerId, deliveryRadiusKm).catch(console.error);
    }

    setPartners((prev) =>
      prev.map((p) => {
        if (p.id === partnerId) {
          return {
            ...p,
            status,
            commissionRate: commissionRate !== undefined ? commissionRate : p.commissionRate,
            deliveryRadiusKm: deliveryRadiusKm !== undefined ? deliveryRadiusKm : p.deliveryRadiusKm,
          };
        }
        return p;
      })
    );
  };

  const registerNewPartner = (partnerData: Partial<Partner>): Partner => {
    const newPartner: Partner = {
      id: `partner-${Date.now()}`,
      businessName: partnerData.businessName || 'New Electrical Store',
      ownerName: partnerData.ownerName || 'Store Owner',
      type: partnerData.type || 'RETAILER',
      city: partnerData.city || currentCity,
      state: partnerData.state || 'Andhra Pradesh',
      pincode: partnerData.pincode || '520002',
      address: partnerData.address || 'Besant Road, Vijayawada',
      phone: partnerData.phone || '+91 98480 00000',
      email: partnerData.email || 'partner@electrakart.com',
      gstin: partnerData.gstin || '37XXXXX1234X1Z1',
      pan: partnerData.pan || 'XXXXX1234X',
      bankAccount: partnerData.bankAccount || '9876543210123',
      bankIfsc: partnerData.bankIfsc || 'SBIN0001234',
      status: 'PENDING',
      commissionRate: 5.5,
      deliveryRadiusKm: 8.0,
      rating: 0,
      totalOrdersFulfilled: 0,
      brandsSold: partnerData.brandsSold || ['Polycab', 'Anchor'],
      joinedDate: new Date().toISOString().split('T')[0],
      storePhoto: partnerData.storePhoto,
    };

    partnerService.registerPartner(newPartner).catch(console.error);

    setPartners((prev) => [newPartner, ...prev]);
    return newPartner;
  };

  const resolveMappingQueueItem = (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    approvedSku?: string
  ) => {
    setMappingQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status, suggestedSku: approvedSku || item.suggestedSku } : item))
    );
  };

  return (
    <StoreContext.Provider
      value={{
        userRole,
        setUserRole,
        currentCity,
        setCurrentCity,
        pincode,
        setPincode,
        isLocationModalOpen,
        setIsLocationModalOpen,
        isBackendLive,
        products,
        getProductById,
        getProductBySku,
        getNearbyStockForProduct,
        addMasterProduct,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartSubtotal,
        cartGstTotal,
        cartDeliveryFee,
        cartGrandTotal,
        cartFulfillmentsCount,
        currentEstimateItems,
        isProcessingEstimate,
        estimateStage,
        startEstimateAnalysis,
        resolveEstimateItem,
        addManualEstimateItem,
        removeEstimateItem,
        quotations,
        createQuotationFromEstimate,
        acceptQuotation,
        orders,
        placeOrder,
        updateFulfillmentStatus,
        retailerInventory,
        adjustRetailerStock,
        importBulkInventory,
        warehouses,
        transferWarehouseStock,
        partners,
        updatePartnerStatus,
        registerNewPartner,
        mappingQueue,
        resolveMappingQueueItem,
        services: {
          auth: authService,
          product: productService,
          inventory: inventoryService,
          pricing: pricingService,
          estimate: estimateService,
          quotation: quotationService,
          cart: cartService,
          order: orderService,
          partner: partnerService,
          warehouse: warehouseService,
          notification: notificationService,
        },
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
