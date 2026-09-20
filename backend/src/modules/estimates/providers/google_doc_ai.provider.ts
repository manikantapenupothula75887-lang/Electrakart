/**
 * ElectraKart Google Cloud Document AI OCR Provider Adapter
 * Uses Document AI Form / General Processor for document intelligence.
 */

import { IOcrProvider, OcrExtractionResult, ExtractedOcrLine } from '../ocr.types.js';

export interface GoogleDocAiConfig {
  projectId: string;
  location: string;
  processorId: string;
}

export class GoogleDocAiOcrProvider implements IOcrProvider {
  private config: GoogleDocAiConfig;

  constructor(config: GoogleDocAiConfig) {
    this.config = config;
  }

  async extractText(
    buffer: Buffer,
    mimeType: string,
    _filename: string
  ): Promise<OcrExtractionResult> {
    const { projectId, location, processorId } = this.config;

    if (!projectId || !processorId) {
      throw new Error(
        '[GoogleDocAiOcrProvider] Missing Google Cloud Document AI configuration (projectId or processorId).'
      );
    }

    const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

    const requestBody = {
      rawDocument: {
        content: buffer.toString('base64'),
        mimeType,
      },
    };

    // In a live environment with Google Cloud credentials, this uses Google Auth Client / fetch.
    // When live credentials are provided via GOOGLE_APPLICATION_CREDENTIALS:
    const accessToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN || '';
    if (!accessToken && process.env.NODE_ENV === 'production') {
      throw new Error(
        '[GoogleDocAiOcrProvider] Live Google Cloud authentication token not initialized. Set GOOGLE_APPLICATION_CREDENTIALS in cloud secret manager.'
      );
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[GoogleDocAiOcrProvider] Document AI API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as any;
    const documentText = data?.document?.text || '';
    const pages = data?.document?.pages || [];

    const lines: ExtractedOcrLine[] = [];
    let lineIdx = 1;

    for (const page of pages) {
      const pageLines = page.lines || [];
      for (const line of pageLines) {
        const textSegments = line.layout?.textAnchor?.textSegments || [];
        const lineText = textSegments
          .map((seg: any) => {
            const start = parseInt(seg.startIndex || '0', 10);
            const end = parseInt(seg.endIndex || '0', 10);
            return documentText.slice(start, end);
          })
          .join('')
          .trim();

        if (lineText) {
          lines.push({
            text: lineText,
            lineNumber: lineIdx++,
            confidence: line.layout?.confidence || 0.9,
            boundingBox: line.layout?.boundingPoly,
          });
        }
      }
    }

    return {
      rawText: documentText,
      lines,
      provider: 'GOOGLE_DOCUMENT_AI',
      confidenceScore: data?.document?.confidence || 0.92,
      metadata: {
        pageCount: pages.length,
      },
    };
  }
}
