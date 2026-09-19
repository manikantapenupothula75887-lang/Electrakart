/**
 * ElectraKart Production Partner Service
 * Communicates with backend partner management, KYC onboarding,
 * and delivery zone governance endpoints.
 */

import { IPartnerService } from '../partnerService';
import { Partner, PartnerType, VerificationStatus } from '../../types';
import { apiClient } from '../../api/client';
import { PARTNERS_DATA } from '../../data/mockData';

export class ProductionPartnerService implements IPartnerService {
  async getPartners(): Promise<Partner[]> {
    try {
      const res = await apiClient.get<Partner[]>('/partners');
      return res.length > 0 ? res : PARTNERS_DATA;
    } catch {
      return PARTNERS_DATA;
    }
  }

  async getPartnerById(id: string): Promise<Partner | undefined> {
    try {
      return await apiClient.get<Partner>(`/partners/${id}`);
    } catch {
      return PARTNERS_DATA.find((p) => p.id === id);
    }
  }

  async getPartnersByType(type: PartnerType): Promise<Partner[]> {
    try {
      const res = await apiClient.get<Partner[]>(`/partners?type=${type}`);
      return res.length > 0 ? res : PARTNERS_DATA.filter((p) => p.type === type);
    } catch {
      return PARTNERS_DATA.filter((p) => p.type === type);
    }
  }

  async updatePartnerStatus(id: string, status: VerificationStatus): Promise<Partner | undefined> {
    try {
      await apiClient.patch(`/partners/${id}/governance`, { status });
      return await this.getPartnerById(id);
    } catch {
      return undefined;
    }
  }

  async updateDeliveryRadius(id: string, radiusKm: number): Promise<Partner | undefined> {
    try {
      await apiClient.patch(`/partners/${id}/governance`, { deliveryRadiusKm: radiusKm });
      return await this.getPartnerById(id);
    } catch {
      return undefined;
    }
  }

  async updateCommissionRate(id: string, commissionPercent: number): Promise<Partner | undefined> {
    try {
      await apiClient.patch(`/partners/${id}/governance`, { commissionRatePercent: commissionPercent });
      return await this.getPartnerById(id);
    } catch {
      return undefined;
    }
  }

  async registerPartner(
    partnerData: Omit<Partner, 'id' | 'status' | 'rating' | 'totalOrdersFulfilled' | 'joinedDate'>
  ): Promise<Partner> {
    try {
      const res = await apiClient.post<any>('/partners/register', partnerData);
      return {
        ...partnerData,
        id: res.id || `partner-${Date.now()}`,
        status: 'PENDING',
        rating: 0,
        totalOrdersFulfilled: 0,
        joinedDate: new Date().toISOString().split('T')[0],
      };
    } catch {
      return {
        ...partnerData,
        id: `partner-${Date.now()}`,
        status: 'PENDING',
        rating: 0,
        totalOrdersFulfilled: 0,
        joinedDate: new Date().toISOString().split('T')[0],
      };
    }
  }
}

export const prodPartnerService = new ProductionPartnerService();
