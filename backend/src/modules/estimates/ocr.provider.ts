/**
 * ElectraKart OCR Provider Factory
 * Dynamically instantiates active OCR provider with production protection guards.
 */

import { IOcrProvider } from './ocr.types.js';
import { MockOcrProvider } from './providers/mock.ocr.provider.js';
import { GoogleDocAiOcrProvider } from './providers/google_doc_ai.provider.js';
import { AwsTextractOcrProvider } from './providers/aws_textract.provider.js';
import { DisabledOcrProvider } from './providers/disabled.ocr.provider.js';
import { config } from '../../config/environment.js';

let cachedProvider: IOcrProvider | null = null;

export function resetOcrProviderCache(): void {
  cachedProvider = null;
}

export function getOcrProvider(forceProvider?: string): IOcrProvider {
  const providerType = (forceProvider || config.ocrProvider || 'mock').toLowerCase();

  // Strict production safety guard
  if ((config.isProduction || process.env.NODE_ENV === 'production') && (providerType === 'mock' || config.ocrProvider === 'mock')) {
    throw new Error(
      '[Security Alert] Mock OCR provider cannot be instantiated in production environment. A live external OCR provider (Google Document AI or AWS Textract) must be configured, or OCR must be set to disabled.'
    );
  }

  if (cachedProvider && !forceProvider) {
    return cachedProvider;
  }

  let provider: IOcrProvider;

  switch (providerType) {
    case 'google_document_ai':
      provider = new GoogleDocAiOcrProvider({
        projectId: config.googleDocAiProjectId,
        location: config.googleDocAiLocation,
        processorId: config.googleDocAiProcessorId,
      });
      break;

    case 'aws_textract':
      provider = new AwsTextractOcrProvider({
        region: config.awsTextractRegion,
        accessKeyId: config.awsTextractAccessKeyId,
        secretAccessKey: config.awsTextractSecretAccessKey,
      });
      break;

    case 'disabled':
      provider = new DisabledOcrProvider();
      break;

    case 'mock':
    default:
      provider = new MockOcrProvider();
      break;
  }

  if (!forceProvider) {
    cachedProvider = provider;
  }

  return provider;
}
