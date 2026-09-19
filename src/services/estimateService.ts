/**
 * ElectraKart AI Estimate Service
 * Integration boundary for document scanning, OCR line extraction, and disambiguation.
 */

import { EstimateExtractedItem, Product } from '../types';
import { PRODUCTS_DATA } from '../data/mockData';

export interface IEstimateService {
  processEstimate(
    sampleId?: string,
    rawText?: string,
    onProgress?: (stageName: string) => void
  ): Promise<EstimateExtractedItem[]>;
  resolveItem(
    items: EstimateExtractedItem[],
    itemId: string,
    selectedMatch: { sku: string; brand: string; series: string; spec: string }
  ): EstimateExtractedItem[];
}

class DemoEstimateService implements IEstimateService {
  private readonly stages = [
    'Reading Estimate Document...',
    'Extracting Line Items & Quantities...',
    'Identifying Brands & Product Categories...',
    'Matching Series & Configurations...',
    'Resolving Electrical Specifications...',
    'Checking Nearby Inventory Availability...',
    'Calculating Locked Guaranteed Pricing...',
    'Synthesizing Official Quotation...',
  ];

  async processEstimate(
    sampleId?: string,
    _rawText?: string,
    onProgress?: (stageName: string) => void
  ): Promise<EstimateExtractedItem[]> {
    for (let i = 0; i < this.stages.length; i++) {
      if (onProgress) onProgress(this.stages[i]);
      await new Promise((r) => setTimeout(r, 400));
    }

    if (sampleId === 'estimate-sample-2') {
      return [
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
          matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'FIN-FRL-15-BLU-90M'),
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
          matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'FIN-FRL-40-GRN-90M'),
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
          matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'ANC-ROM-8M-PLT-WHT'),
        },
        {
          id: 'ext-c4',
          rawText: 'Anchor Roma 6A 1-way modular switch - 40 Nos',
          quantity: 4,
          unit: 'Pack (10 Nos)',
          detectedBrand: 'Anchor',
          detectedSeries: 'Roma Classic',
          detectedConfig: '1 Module',
          detectedSpec: '6A 240V AC 1-Way Modular',
          confidence: 'HIGH',
          reason: 'Pack of 10s calculated from 40 loose switch requirement.',
          matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'ANC-ROM-6A1W-WHT'),
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
          matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'PHI-STL-15W-WW'),
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
          matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'SCH-ACT-16A-SP'),
        },
      ];
    }

    // Default Residential Sample
    return [
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
        matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'POL-WX-25-RED-90M'),
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
        matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'POL-WX-15-YEL-90M'),
      },
      {
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
        matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'ANC-ROM-6M-PLT-WHT'),
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
        matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'LEG-ART-16AS-MG'),
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
        matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'HAV-STL-1200-BLU'),
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
        matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'SCH-ACT-16A-SP'),
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
        matchedProduct: PRODUCTS_DATA.find((p) => p.sku === 'POL-RCCB-63A-4P30'),
      },
    ];
  }

  resolveItem(
    items: EstimateExtractedItem[],
    itemId: string,
    selectedMatch: { sku: string; brand: string; series: string; spec: string }
  ): EstimateExtractedItem[] {
    const prod = PRODUCTS_DATA.find((p) => p.sku === selectedMatch.sku);
    return items.map((item) => {
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
    });
  }
}

export const estimateService: IEstimateService = new DemoEstimateService();
