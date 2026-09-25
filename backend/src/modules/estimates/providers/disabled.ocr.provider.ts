/**
 * ElectraKart Disabled OCR Provider
 * Production-safe placeholder when external cloud OCR (Google Document AI / AWS Textract)
 * is not configured. Returns a clear, structured RFC7807-compatible error response.
 * Strictly avoids generating mock/fake OCR extractions in production.
 */

import { IOcrProvider, OcrExtractionResult } from '../ocr.types.js';

export class DisabledOcrProvider implements IOcrProvider {
  async extractText(
    _buffer: Buffer,
    _mimeType: string,
    _filename: string
  ): Promise<OcrExtractionResult> {
    const error: any = new Error(
      'OCR service is not configured. Estimate upload is available, but automatic OCR extraction is currently unavailable.'
    );
    error.statusCode = 503;
    error.type = 'https://api.electrakart.com/errors/ocr-not-configured';
    error.title = 'OCR Service Not Configured';
    error.code = 'OCR_NOT_CONFIGURED';
    throw error;
  }
}
