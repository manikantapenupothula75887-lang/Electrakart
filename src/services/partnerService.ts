/**
 * ElectraKart Partner Service
 * Manages Retailer and Distributor partner networks, verification,
 * commission agreements, and local delivery zones.
 */

import { Partner, PartnerType, VerificationStatus } from '../types';
import { PARTNERS_DATA } from '../data/mockData';

export interface IPartnerService {
  getPartners(): Promise<Partner[]>;
  getPartnerById(id: string): Promise<Partner | undefined>;
  getPartnersByType(type: PartnerType): Promise<Partner[]>;
  updatePartnerStatus(id: string, status: VerificationStatus): Promise<Partner | undefined>;
  updateDeliveryRadius(id: string, radiusKm: number): Promise<Partner | undefined>;
  updateCommissionRate(id: string, commissionPercent: number): Promise<Partner | undefined>;
  registerPartner(partnerData: Omit<Partner, 'id' | 'status' | 'rating' | 'totalOrdersFulfilled' | 'joinedDate'>): Promise<Partner>;
}

class DemoPartnerService implements IPartnerService {
  private readonly STORAGE_KEY = 'electrakart_partners';

  private loadPartners(): Partner[] {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : PARTNERS_DATA;
  }

  private savePartners(partners: Partner[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(partners));
  }

  async getPartners(): Promise<Partner[]> {
    return this.loadPartners();
  }

  async getPartnerById(id: string): Promise<Partner | undefined> {
    const partners = this.loadPartners();
    return partners.find((p) => p.id === id);
  }

  async getPartnersByType(type: PartnerType): Promise<Partner[]> {
    const partners = this.loadPartners();
    return partners.filter((p) => p.type === type);
  }

  async updatePartnerStatus(id: string, status: VerificationStatus): Promise<Partner | undefined> {
    const partners = this.loadPartners();
    const index = partners.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    partners[index] = {
      ...partners[index],
      status,
    };
    this.savePartners(partners);
    return partners[index];
  }

  async updateDeliveryRadius(id: string, radiusKm: number): Promise<Partner | undefined> {
    const partners = this.loadPartners();
    const index = partners.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    partners[index] = {
      ...partners[index],
      deliveryRadiusKm: radiusKm,
    };
    this.savePartners(partners);
    return partners[index];
  }

  async updateCommissionRate(id: string, commissionPercent: number): Promise<Partner | undefined> {
    const partners = this.loadPartners();
    const index = partners.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    partners[index] = {
      ...partners[index],
      commissionRate: commissionPercent,
    };
    this.savePartners(partners);
    return partners[index];
  }

  async registerPartner(
    partnerData: Omit<Partner, 'id' | 'status' | 'rating' | 'totalOrdersFulfilled' | 'joinedDate'>
  ): Promise<Partner> {
    const partners = this.loadPartners();
    const newPartner: Partner = {
      ...partnerData,
      id: `partner-${Date.now()}`,
      status: 'PENDING',
      rating: 0,
      totalOrdersFulfilled: 0,
      joinedDate: new Date().toISOString().split('T')[0],
    };
    const updated = [newPartner, ...partners];
    this.savePartners(updated);
    return newPartner;
  }
}

export const partnerService: IPartnerService = new DemoPartnerService();
