/**
 * ElectraKart Production Order Service
 * Creates multi-store orders with atomic inventory reservation
 * and tracks live fulfillment states in PostgreSQL.
 */

import { IOrderService, CreateOrderInput } from '../orderService';
import { Order, OrderStatus } from '../../types';
import { apiClient } from '../../api/client';
import { handleFallbackOrThrow, isDemoFallbackAllowed } from './fallbackPolicy';

export class ProductionOrderService implements IOrderService {
  async getOrders(): Promise<Order[]> {
    try {
      return await apiClient.get<Order[]>('/orders');
    } catch (err) {
      return handleFallbackOrThrow('ProductionOrderService', 'getOrders', err, []);
    }
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    try {
      return await apiClient.get<Order>(`/orders/${id}`);
    } catch (err) {
      return handleFallbackOrThrow('ProductionOrderService', 'getOrderById', err, undefined);
    }
  }

  async createOrder(input: CreateOrderInput, idempotencyKey?: string): Promise<Order> {
    try {
      const headers: Record<string, string> = {};
      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
      }

      const created = await apiClient.post<Order>(
        '/orders',
        {
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          deliveryAddress: input.deliveryAddress,
          city: input.city,
          pincode: input.pincode,
          deliveryMethod: input.deliveryMethod,
          paymentMethod: input.paymentMethod,
          cart: input.cart,
        },
        { headers }
      );
      return created;
    } catch (err) {
      console.error('[ProductionOrderService] Failed to create order on backend:', err);
      // Order creation should NEVER silently fallback to mock data
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
      if (!isDemoFallbackAllowed()) {
        throw err;
      }
      return undefined;
    }
  }
}

export const prodOrderService = new ProductionOrderService();
