/**
 * ElectraKart Production Quotation Service
 * Generates and persists legally binding 48-hour locked quotations in PostgreSQL.
 */

import { IQuotationService } from '../quotationService';
import { Quotation, EstimateExtractedItem } from '../../types';
import { apiClient } from '../../api/client';
import { PRODUCTS_DATA } from '../../data/mockData';
import { handleFallbackOrThrow } from './fallbackPolicy';

export class ProductionQuotationService implements IQuotationService {
  async getQuotations(): Promise<Quotation[]> {
    try {
      const res = await apiClient.get<any[]>('/quotations');
      return res.map((q) => ({
        id: q.id,
        quotationNumber: q.quotation_number || q.quotationNumber,
        createdAt: q.created_at || q.createdAt,
        validUntil: q.locked_until_timestamp || q.validUntil,
        customerName: q.customer_name || q.customerName,
        customerPhone: q.customer_phone || q.customerPhone,
        deliveryAddress: q.delivery_address || q.deliveryAddress,
        city: q.city,
        pincode: q.pincode,
        subtotal: parseFloat(q.subtotal_inr || q.subtotal),
        discount: parseFloat(q.discount_inr || q.discount),
        deliveryFee: parseFloat(q.delivery_fee_inr || q.deliveryFee),
        gstTotal: parseFloat(q.gst_total_inr || q.gstTotal),
        grandTotal: parseFloat(q.grand_total_inr || q.grandTotal),
        isPriceLocked: q.is_price_locked ?? true,
        status: q.status,
        items: q.items || [],
      }));
    } catch (err) {
      return handleFallbackOrThrow('ProductionQuotationService', 'getQuotations', err, []);
    }
  }

  async getQuotationById(id: string): Promise<Quotation | undefined> {
    try {
      return await apiClient.get<Quotation>(`/quotations/${id}`);
    } catch (err) {
      return handleFallbackOrThrow('ProductionQuotationService', 'getQuotationById', err, undefined);
    }
  }

  async createFromEstimate(
    extractedItems: EstimateExtractedItem[],
    customerName = 'Anil Kumar Reddy',
    customerPhone = '+91 98481 99882',
    address = 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
    city = 'Vijayawada',
    pincode = '520008'
  ): Promise<Quotation> {
    try {
      const items = extractedItems.map((it) => {
        const prod = it.matchedProduct || PRODUCTS_DATA[0];
        return {
          sku: prod.sku,
          name: prod.name,
          brand: prod.brand,
          series: prod.series,
          specification: it.detectedSpec || prod.specification,
          quantity: it.quantity,
          unit: it.unit || prod.unit,
          rate: prod.sellingPrice,
        };
      });

      return await apiClient.post<Quotation>('/quotations/generate', {
        customerName,
        customerPhone,
        deliveryAddress: address,
        city,
        pincode,
        items,
      });
    } catch (err) {
      console.error('[ProductionQuotationService] Failed to create quotation on backend:', err);
      throw err;
    }
  }

  async acceptQuotation(id: string): Promise<Quotation | undefined> {
    try {
      await apiClient.post(`/quotations/${id}/accept`);
      return await this.getQuotationById(id);
    } catch {
      return undefined;
    }
  }
}

export const prodQuotationService = new ProductionQuotationService();
