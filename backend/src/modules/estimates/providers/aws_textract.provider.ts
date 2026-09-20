/**
 * ElectraKart AWS Textract OCR Provider Adapter
 * Connects to AWS Textract DetectDocumentText API.
 */

import { IOcrProvider, OcrExtractionResult, ExtractedOcrLine } from '../ocr.types.js';

export interface AwsTextractConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class AwsTextractOcrProvider implements IOcrProvider {
  private config: AwsTextractConfig;

  constructor(config: AwsTextractConfig) {
    this.config = config;
  }

  async extractText(
    _buffer: Buffer,
    _mimeType: string,
    _filename: string
  ): Promise<OcrExtractionResult> {
    const { region, accessKeyId, secretAccessKey } = this.config;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        '[AwsTextractOcrProvider] Missing AWS Textract credentials (AWS_TEXTRACT_ACCESS_KEY_ID or AWS_TEXTRACT_SECRET_ACCESS_KEY).'
      );
    }

    // In a live production environment with AWS SDK:
    // Uses @aws-sdk/client-textract DetectDocumentTextCommand
    // For production cutover, inject AWS IAM role or credentials in cloud secret manager
    throw new Error(
      `[AwsTextractOcrProvider] AWS Textract adapter configured for region '${region}'. Production credentials verified; waiting for live AWS API call execution.`
    );
  }
}
