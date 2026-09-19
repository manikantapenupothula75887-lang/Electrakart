/**
 * ElectraKart Quotation Service
 * Generates legally valid 48-hour locked quotations with trade rate guarantees.
 */

import { Quotation, QuotationItem, EstimateExtractedItem } from '../types';
import { PRODUCTS_DATA } from '../data/mockData';
import { pricingService } from './pricingService';

export interface IQuotationService {
  getQuotations(): Promise<Quotation[]>;
  getQuotationById(id: string): Promise<Quotation | undefined>;
  createFromEstimate(
    extractedItems: EstimateExtractedItem[],
    customerName: string,
    customerPhone: string,
    address: string,
    city: string,
    pincode: string
  ): Promise<Quotation>;
  acceptQuotation(id: string): Promise<Quotation | undefined>;
}

class DemoQuotationService implements IQuotationService {
  private readonly STORAGE_KEY = 'electrakart_quotations';

  private loadQuotations(): Quotation[] {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  private saveQuotations(quotes: Quotation[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(quotes));
  }

  async getQuotations(): Promise<Quotation[]> {
    return this.loadQuotations();
  }

  async getQuotationById(id: string): Promise<Quotation | undefined> {
    const quotes = this.loadQuotations();
    return quotes.find((q) => q.id === id);
  }

  async createFromEstimate(
    extractedItems: EstimateExtractedItem[],
    customerName: string,
    customerPhone: string,
    address: string,
    city: string,
    pincode: string
  ): Promise<Quotation> {
    const qItems: QuotationItem[] = extractedItems.map((estItem, index) => {
      const prod = estItem.matchedProduct || PRODUCTS_DATA[0];
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

    const pricing = pricingService.calculateQuotationSummary(qItems);
    const now = new Date();
    const expiry = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48-Hour Price Lock

    const newQuotation: Quotation = {
      id: `quo-${Date.now()}`,
      quotationNumber: `EK-QUO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      validUntil: expiry.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      customerName,
      customerPhone,
      deliveryAddress: address,
      city,
      pincode,
      items: qItems,
      subtotal: pricing.subtotalINR,
      discount: pricing.discountINR,
      deliveryFee: pricing.deliveryFeeINR,
      gstTotal: pricing.gstTotalINR,
      grandTotal: pricing.grandTotalINR,
      isPriceLocked: true,
      status: 'LOCKED',
    };

    const quotes = [newQuotation, ...this.loadQuotations()];
    this.saveQuotations(quotes);
    return newQuotation;
  }

  async acceptQuotation(id: string): Promise<Quotation | undefined> {
    const quotes = this.loadQuotations();
    const updated = quotes.map((q) => (q.id === id ? { ...q, status: 'ACCEPTED' as const } : q));
    this.saveQuotations(updated);
    return updated.find((q) => q.id === id);
  }
}

export const quotationService: IQuotationService = new DemoQuotationService();
