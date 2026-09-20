/**
 * ElectraKart OCR & Estimate Intelligence Types
 */

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'AMBIGUOUS';

export type MatchStatus =
  | 'EXACT_MATCH'
  | 'AMBIGUOUS'
  | 'NEEDS_CLARIFICATION'
  | 'NO_MATCH'
  | 'RESOLVED'
  | 'UNAVAILABLE';

export type EstimateProcessingStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'ANALYZING'
  | 'EXTRACTED'
  | 'MATCHING'
  | 'NEEDS_CLARIFICATION'
  | 'PARTIALLY_RESOLVED'
  | 'READY_FOR_QUOTE'
  | 'RESOLVED'
  | 'QUOTED'
  | 'FAILED';

export interface ExtractedOcrLine {
  text: string;
  lineNumber: number;
  confidence: number;
  boundingBox?: any;
}

export interface OcrExtractionResult {
  rawText: string;
  lines: ExtractedOcrLine[];
  provider: 'MOCK' | 'GOOGLE_DOCUMENT_AI' | 'AWS_TEXTRACT';
  confidenceScore: number;
  metadata?: Record<string, any>;
}

export interface ExtractedLineItem {
  id?: string;
  rawText: string;
  normalizedText: string;
  quantity: number;
  unit: string;
  detectedBrand?: string;
  detectedSeries?: string;
  detectedConfig?: string;
  detectedSpec?: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  matchStatus: MatchStatus;
  matchedSkuId?: string | null;
  matchedSkuCode?: string | null;
  productName?: string | null;
  unitPriceInr?: number | null;
  candidateOptions?: CandidateOption[];
  matchingEvidence?: MatchingEvidence;
  clarificationPrompt?: string | null;
  isResolvedByCustomer?: boolean;
  inventoryAvailable?: boolean;
  availableStock?: number;
}

export interface CandidateOption {
  sku: string;
  name: string;
  brand: string;
  series: string;
  specification: string;
  price: number;
  unit: string;
  inStock: boolean;
}

export interface MatchingEvidence {
  brandMatch?: {
    brandName: string;
    score: number;
    sourceToken: string;
  };
  seriesMatch?: {
    seriesName: string;
    score: number;
    sourceToken: string;
  };
  specificationsDetected?: string[];
  candidateCount?: number;
  reasons: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  fileType: 'PDF' | 'JPG' | 'JPEG' | 'PNG' | 'MANUAL_TEXT' | 'UNKNOWN';
  mimeType: string;
  sizeBytes: number;
  error?: string;
}

export interface IOcrProvider {
  extractText(buffer: Buffer, mimeType: string, filename: string): Promise<OcrExtractionResult>;
}
