/**
 * ElectraKart File Validation Utility
 * Enforces strict MIME, size, extension, and magic-byte integrity checks.
 */

import path from 'path';
import { FileValidationResult } from './ocr.types.js';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

// Binary magic bytes signatures
const MAGIC_BYTES = {
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47],
};

function matchesMagicBytes(buffer: Buffer, magic: number[]): boolean {
  if (buffer.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false;
  }
  return true;
}

export function sanitizeFilename(rawFilename: string): string {
  const base = path.basename(rawFilename);
  // Remove dangerous path traversal, control chars, and replace whitespace
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export function validateEstimateFile(
  buffer: Buffer,
  filename: string,
  providedMimeType?: string
): FileValidationResult {
  const sizeBytes = buffer.length;

  if (sizeBytes === 0) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      mimeType: providedMimeType || 'application/octet-stream',
      sizeBytes: 0,
      error: 'Uploaded file is empty (0 bytes).',
    };
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      mimeType: providedMimeType || 'application/octet-stream',
      sizeBytes,
      error: `File size (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 25 MB.`,
    };
  }

  const ext = path.extname(filename).toLowerCase();

  // Explicitly reject executable and dangerous script extensions
  const dangerousExts = ['.exe', '.sh', '.bat', '.cmd', '.js', '.mjs', '.php', '.py', '.rb', '.dll', '.bin'];
  if (dangerousExts.includes(ext)) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      mimeType: providedMimeType || 'application/octet-stream',
      sizeBytes,
      error: `File extension '${ext}' is an executable/script format and is strictly prohibited for security.`,
    };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      mimeType: providedMimeType || 'application/octet-stream',
      sizeBytes,
      error: `Unsupported file extension '${ext}'. Supported formats: PDF, JPG, JPEG, PNG.`,
    };
  }

  const normalizedMime = (providedMimeType || '').toLowerCase();
  if (normalizedMime && !ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      mimeType: normalizedMime,
      sizeBytes,
      error: `Unsupported MIME type '${normalizedMime}'. Supported formats: PDF, JPG, JPEG, PNG.`,
    };
  }

  // Verify binary magic bytes integrity to prevent extension spoofing
  let detectedType: 'PDF' | 'JPG' | 'JPEG' | 'PNG' | 'UNKNOWN' = 'UNKNOWN';
  let detectedMime = 'application/octet-stream';

  if (matchesMagicBytes(buffer, MAGIC_BYTES.PDF)) {
    detectedType = 'PDF';
    detectedMime = 'application/pdf';
  } else if (matchesMagicBytes(buffer, MAGIC_BYTES.JPEG)) {
    detectedType = ext === '.jpeg' ? 'JPEG' : 'JPG';
    detectedMime = 'image/jpeg';
  } else if (matchesMagicBytes(buffer, MAGIC_BYTES.PNG)) {
    detectedType = 'PNG';
    detectedMime = 'image/png';
  }

  if (detectedType === 'UNKNOWN') {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      mimeType: detectedMime,
      sizeBytes,
      error: 'File content does not match genuine PDF, JPEG, or PNG binary signatures (corrupt or disguised file).',
    };
  }

  // Cross-verify extension matches detected binary type
  const isExtensionValid =
    (detectedType === 'PDF' && ext === '.pdf') ||
    ((detectedType === 'JPG' || detectedType === 'JPEG') && (ext === '.jpg' || ext === '.jpeg')) ||
    (detectedType === 'PNG' && ext === '.png');

  if (!isExtensionValid) {
    return {
      isValid: false,
      fileType: detectedType,
      mimeType: detectedMime,
      sizeBytes,
      error: `File extension '${ext}' does not match detected binary content type '${detectedType}'.`,
    };
  }

  return {
    isValid: true,
    fileType: detectedType,
    mimeType: detectedMime,
    sizeBytes,
  };
}
