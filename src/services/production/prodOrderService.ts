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
      if (isDemoFallbackAllowed()) {
        const { orderService: demoOrderService } = await import('../orderService');
        return demoOrderService.createOrder(input);
      }
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

  async createPaymentOrder(input: any, idempotencyKey?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
      }
      return await apiClient.post('/payments/create', input, { headers });
    } catch (err) {
      console.error('[ProductionOrderService] createPaymentOrder failed:', err);
      if (isDemoFallbackAllowed()) {
        const { orderService: demoOrderService } = await import('../orderService');
        return demoOrderService.createPaymentOrder(input);
      }
      throw err;
    }
  }

  async verifyPayment(input: any): Promise<any> {
    try {
      return await apiClient.post('/payments/verify', input);
    } catch (err) {
      console.error('[ProductionOrderService] verifyPayment failed:', err);
      if (isDemoFallbackAllowed()) {
        const { orderService: demoOrderService } = await import('../orderService');
        return demoOrderService.verifyPayment(input);
      }
      throw err;
    }
  }

  async retryPayment(orderId: string, paymentMethod?: string): Promise<any> {
    try {
      return await apiClient.post('/payments/retry', { orderId, paymentMethod });
    } catch (err) {
      console.error('[ProductionOrderService] retryPayment failed:', err);
      if (isDemoFallbackAllowed()) {
        const { orderService: demoOrderService } = await import('../orderService');
        return demoOrderService.retryPayment(orderId, paymentMethod);
      }
      throw err;
    }
  }

  async cancelOrder(orderId: string, reason?: string): Promise<any> {
    try {
      return await apiClient.post(`/orders/${orderId}/cancel`, { reason });
    } catch (err) {
      console.error('[ProductionOrderService] cancelOrder failed:', err);
      if (isDemoFallbackAllowed()) {
        const { orderService: demoOrderService } = await import('../orderService');
        return demoOrderService.cancelOrder(orderId, reason);
      }
      throw err;
    }
  }

  async getInvoice(orderId: string): Promise<any> {
    try {
      return await apiClient.get(`/invoices/${orderId}`);
    } catch (err) {
      console.error('[ProductionOrderService] getInvoice failed:', err);
      if (isDemoFallbackAllowed()) {
        const { orderService: demoOrderService } = await import('../orderService');
        return demoOrderService.getInvoice(orderId);
      }
      return handleFallbackOrThrow('ProductionOrderService', 'getInvoice', err, undefined);
    }
  }
}

export const prodOrderService = new ProductionOrderService();
