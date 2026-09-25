/**
 * ElectraKart Electrician Marketplace Domain Types
 */

export const ELECTRICIAN_SPECIALIZATIONS = [
  'WIRING',
  'FANS',
  'LIGHTS',
  'SWITCHES_AND_SOCKETS',
  'SWITCHES_SOCKETS',
  'MCB_DB',
  'MCB_DISTRIBUTION_BOARDS',
  'ELECTRICAL_PANELS',
  'INVERTER_UPS',
  'MOTORS',
  'PUMPS',
  'APPLIANCE_INSTALLATION',
  'INSTALLATION',
  'REPAIR',
  'HOME_ELECTRICAL_REPAIRS',
  'MAINTENANCE',
  'SOLAR_INVERTER',
  'SMART_HOME',
  'COMMERCIAL_ELECTRICAL',
  'COMMERCIAL_ELECTRICAL_REPAIRS',
  'INDUSTRIAL_ELECTRICAL',
  'OTHER',
  'OTHER_ELECTRICAL_SERVICES',
] as const;

export type ElectricianSpecialization = (typeof ELECTRICIAN_SPECIALIZATIONS)[number];

export const SPECIALIZATION_LABELS: Record<ElectricianSpecialization, string> = {
  WIRING: 'Wiring & Cable Fitting',
  FANS: 'Fans (Ceiling, Exhaust, BLDC)',
  LIGHTS: 'Lights & Fixtures',
  SWITCHES_AND_SOCKETS: 'Switches & Sockets',
  SWITCHES_SOCKETS: 'Switches & Sockets',
  MCB_DB: 'MCB & Distribution Boards',
  MCB_DISTRIBUTION_BOARDS: 'MCB & Distribution Boards',
  ELECTRICAL_PANELS: 'Electrical Panels & Meter Boards',
  INVERTER_UPS: 'Inverter & UPS Setup',
  MOTORS: 'Motors & Starters',
  PUMPS: 'Water Pumps & Submersibles',
  APPLIANCE_INSTALLATION: 'Appliance Installation',
  INSTALLATION: 'New Appliance Installation',
  REPAIR: 'Repair & Troubleshooting',
  HOME_ELECTRICAL_REPAIRS: 'Home Electrical Repairs',
  MAINTENANCE: 'Preventive Maintenance & Safety Audit',
  SOLAR_INVERTER: 'Solar Inverter & Rooftop Solar',
  SMART_HOME: 'Smart Home Automation & IoT',
  COMMERCIAL_ELECTRICAL: 'Commercial Electrical Systems',
  COMMERCIAL_ELECTRICAL_REPAIRS: 'Commercial Electrical Repairs',
  INDUSTRIAL_ELECTRICAL: 'Industrial Electrical & Heavy Machinery',
  OTHER: 'Other Electrical Services',
  OTHER_ELECTRICAL_SERVICES: 'Other Electrical Services',
};

export type ElectricianVerificationStatus =
  | 'PENDING_VERIFICATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type ServiceRequestStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'WORK_STARTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REJECTED';

export interface ElectricianProfileEntity {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  experienceYears: number;
  serviceRadiusKm: number;
  city: string;
  pincode: string;
  address: string;
  latitude: number;
  longitude: number;
  idProofUrl?: string;
  licenseUrl?: string;
  profilePhotoUrl?: string;
  inspectionFeeInr: number;
  verificationStatus: ElectricianVerificationStatus;
  rejectionReason?: string;
  isOnline: boolean;
  isBusy: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedJobsCount: number;
  specializations?: ElectricianSpecialization[];
  createdAt: string;
  updatedAt: string;
}

export interface ElectricianRegisterInput {
  fullName: string;
  phone: string;
  email?: string;
  password?: string;
  experienceYears: number;
  serviceRadiusKm?: number;
  city: string;
  pincode: string;
  address: string;
  latitude: number;
  longitude: number;
  specializations: ElectricianSpecialization[];
  inspectionFeeInr?: number;
  idProofUrl?: string;
  licenseUrl?: string;
  profilePhotoUrl?: string;
}

export interface ElectricianSearchQuery {
  latitude: number;
  longitude: number;
  category?: ElectricianSpecialization;
  city?: string;
  pincode?: string;
  maxDistanceKm?: number;
}

export interface ElectricianSearchResult {
  id: string;
  fullName: string;
  phone: string;
  experienceYears: number;
  ratingAvg: number;
  ratingCount: number;
  completedJobsCount: number;
  inspectionFeeInr: number;
  distanceKm: number;
  city: string;
  pincode: string;
  specializations: ElectricianSpecialization[];
  isOnline: boolean;
}

export interface CreateServiceRequestInput {
  category: ElectricianSpecialization;
  description: string;
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  preferredTime?: 'IMMEDIATE' | 'SCHEDULED';
  preferredScheduleTime?: string;
  assignedElectricianId?: string; // Optional direct request
}

export interface ServiceRequestEntity {
  id: string;
  requestNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  category: ElectricianSpecialization;
  description: string;
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  preferredTime: string;
  status: ServiceRequestStatus;
  assignedElectricianId?: string;
  electricianName?: string;
  electricianPhone?: string;
  inspectionFeeInr: number;
  totalChargesInr?: number;
  cancellationReason?: string;
  cancelledBy?: string;
  requestedAt: string;
  acceptedAt?: string;
  customerNotifiedAt?: string;
  arrivedAt?: string;
  workStartedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface SubmitRatingInput {
  rating: number;
  review?: string;
}
