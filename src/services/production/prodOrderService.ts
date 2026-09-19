/**
 * ElectraKart Production Order Service
 * Creates multi-store orders with atomic inventory reservation
 * and tracks live fulfillment states in PostgreSQL.
 */

import { IOrderService, CreateOrderInput } from '../orderService';
import { Order, OrderStatus } from '../../types';
import { apiClient } from '../../api/client';

export class ProductionOrderService implements IOrderService {
  async getOrders(): Promise<Order[]> {
    try {
      return await apiClient.get<Order[]>('/orders');
    } catch (err) {
      console.warn('[ProductionOrderService] getOrders fallback to empty array:', err);
      return [];
    }
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    try {
      return await apiClient.get<Order>(`/orders/${id}`);
    } catch {
      return undefined;
    }
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    try {
      const created = await apiClient.post<Order>('/orders', {
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        deliveryAddress: input.deliveryAddress,
        city: input.city,
        pincode: input.pincode,
        deliveryMethod: input.deliveryMethod,
        paymentMethod: input.paymentMethod,
        cart: input.cart,
      });
      return created;
    } catch (err) {
      console.error('[ProductionOrderService] Failed to create order on backend:', err);
      throw err;
    }
  }

  async updateFulfillmentStatus(
    orderId: string,
    fulfillmentId: string,
    status: OrderStatus,
    note?: string
  ): Promise<Order | undefined> {
    try {
      await apiClient.post(`/orders/${orderId}/fulfillments/${fulfillmentId}/status`, {
        status,
        note,
      });
      return await this.getOrderById(orderId);
    } catch (err) {
      console.error('[ProductionOrderService] updateFulfillmentStatus failed:', err);
      return undefined;
    }
  }
}

export const prodOrderService = new ProductionOrderService();
