/**
 * ElectraKart Order Service
 * Handles unified order creation, multi-store split routing, and lifecycle states.
 */

import { Order, CartItem, Partner, OrderStatus, OrderFulfillment } from '../types';
import { INITIAL_ORDERS, PARTNERS_DATA } from '../data/mockData';
import { pricingService } from './pricingService';

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  city: string;
  pincode: string;
  deliveryMethod: 'STANDARD' | 'EXPRESS' | 'PICKUP';
  paymentMethod: 'UPI' | 'NET_BANKING' | 'TRADE_CREDIT' | 'COD';
  cart: CartItem[];
  partners: Partner[];
}

export interface IOrderService {
  getOrders(): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateFulfillmentStatus(
    orderId: string,
    fulfillmentId: string,
    status: OrderStatus,
    note?: string
  ): Promise<Order | undefined>;
}

class DemoOrderService implements IOrderService {
  private readonly STORAGE_KEY = 'electrakart_orders';

  private loadOrders(): Order[] {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  }

  private saveOrders(orders: Order[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
  }

  async getOrders(): Promise<Order[]> {
    return this.loadOrders();
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const orders = this.loadOrders();
    return orders.find((o) => o.id === id || o.orderNumber === id);
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const pricing = pricingService.calculateCartSummary(input.cart);
    const orderNumber = `EK-${Math.floor(10000 + Math.random() * 90000)}`;

    // Group items by partner location
    const grouped = new Map<string, CartItem[]>();
    input.cart.forEach((item) => {
      const pId = item.selectedStore.partnerId;
      if (!grouped.has(pId)) grouped.set(pId, []);
      grouped.get(pId)!.push(item);
    });

    const fulfillments: OrderFulfillment[] = Array.from(grouped.entries()).map(
      ([partnerId, items], idx) => {
        const partner =
          input.partners.find((p) => p.id === partnerId) || {
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
              description: `Paid via ${input.paymentMethod}`,
            },
            {
              status: 'CONFIRMED' as OrderStatus,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              title: 'Store Assigned',
              description: `Allocated to ${partner.businessName}`,
            },
          ],
        };
      }
    );

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      createdAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      deliveryAddress: input.deliveryAddress,
      city: input.city,
      pincode: input.pincode,
      deliveryMethod: input.deliveryMethod,
      fulfillments,
      subtotal: pricing.subtotalINR,
      discount: pricing.discountINR,
      deliveryFee: pricing.deliveryFeeINR,
      gstTotal: pricing.gstTotalINR,
      grandTotal: pricing.grandTotalINR,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'PAID',
      overallStatus: 'CONFIRMED',
    };

    const orders = [newOrder, ...this.loadOrders()];
    this.saveOrders(orders);
    return newOrder;
  }

  async updateFulfillmentStatus(
    orderId: string,
    fulfillmentId: string,
    status: OrderStatus,
    note?: string
  ): Promise<Order | undefined> {
    const orders = this.loadOrders();
    let updatedOrder: Order | undefined;

    const updated = orders.map((order) => {
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

      const allDelivered = updatedFulfillments.every((f) => f.status === 'DELIVERED');
      const overall = allDelivered ? 'DELIVERED' : status;

      updatedOrder = {
        ...order,
        overallStatus: overall,
        fulfillments: updatedFulfillments,
      };

      return updatedOrder;
    });

    this.saveOrders(updated);
    return updatedOrder;
  }
}

export const orderService: IOrderService = new DemoOrderService();
