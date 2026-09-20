/**
 * ElectraKart OCR Text Normalizer & Line Item Extraction Pipeline
 */

import { ExtractedLineItem } from './ocr.types.js';

/**
 * Normalizes electrical units, ratings, and common abbreviations.
 */
export function normalizeOcrText(rawText: string): string {
  let text = rawText.trim();

  // Strip leading list numbers like "1.", "2)", "[3]", "-", "*"
  text = text.replace(/^[\d]+[\.\)\:\-]\s*/, '').replace(/^[-*•]\s*/, '');

  // 1. Current Ratings
  text = text.replace(/\b6\s*(?:a|amp|amps|ampere)\b/gi, '6A');
  text = text.replace(/\b10\s*(?:a|amp|amps|ampere)\b/gi, '10A');
  text = text.replace(/\b16\s*(?:a|amp|amps|ampere)\b/gi, '16A');
  text = text.replace(/\b20\s*(?:a|amp|amps|ampere)\b/gi, '20A');
  text = text.replace(/\b25\s*(?:a|amp|amps|ampere)\b/gi, '25A');
  text = text.replace(/\b32\s*(?:a|amp|amps|ampere)\b/gi, '32A');
  text = text.replace(/\b40\s*(?:a|amp|amps|ampere)\b/gi, '40A');
  text = text.replace(/\b63\s*(?:a|amp|amps|ampere)\b/gi, '63A');

  // 2. Wire Cross-Sections (e.g. "2.5 sq mm" -> "2.5 sq.mm")
  text = text.replace(/\b0\.75\s*(?:sq\s*\.?\s*mm|sqmm|mm2)\b/gi, '0.75 sq.mm');
  text = text.replace(/\b1\.0\s*(?:sq\s*\.?\s*mm|sqmm|mm2)\b/gi, '1.0 sq.mm');
  text = text.replace(/\b1\.5\s*(?:sq\s*\.?\s*mm|sqmm|mm2)\b/gi, '1.5 sq.mm');
  text = text.replace(/\b2\.5\s*(?:sq\s*\.?\s*mm|sqmm|mm2)\b/gi, '2.5 sq.mm');
  text = text.replace(/\b4(?:\.0)?\s*(?:sq\s*\.?\s*mm|sqmm|mm2)\b/gi, '4.0 sq.mm');
  text = text.replace(/\b6(?:\.0)?\s*(?:sq\s*\.?\s*mm|sqmm|mm2)\b/gi, '6.0 sq.mm');
  text = text.replace(/\b10(?:\.0)?\s*(?:sq\s*\.?\s*mm|sqmm|mm2)\b/gi, '10.0 sq.mm');

  // 3. Modular Plates
  text = text.replace(/\b1\s*m(?:od(?:ule)?)?\b/gi, '1 Module');
  text = text.replace(/\b2\s*m(?:od(?:ule)?)?\b/gi, '2 Module');
  text = text.replace(/\b3\s*m(?:od(?:ule)?)?\b/gi, '3 Module');
  text = text.replace(/\b4\s*m(?:od(?:ule)?)?\b/gi, '4 Module');
  text = text.replace(/\b6\s*m(?:od(?:ule)?)?\b/gi, '6 Module');
  text = text.replace(/\b8\s*m(?:od(?:ule)?)?\b/gi, '8 Module');
  text = text.replace(/\b12\s*m(?:od(?:ule)?)?\b/gi, '12 Module');
  text = text.replace(/\b18\s*m(?:od(?:ule)?)?\b/gi, '18 Module');

  // 4. Poles & Configurations
  text = text.replace(/\b1\s*-?\s*ways?\b/gi, '1-Way');
  text = text.replace(/\b2\s*-?\s*ways?\b/gi, '2-Way');
  text = text.replace(/\b(?:single\s+pole|1\s*p(?:ole)?)\b/gi, 'SP');
  text = text.replace(/\b(?:double\s+pole|2\s*p(?:ole)?)\b/gi, 'DP');
  text = text.replace(/\b(?:triple\s+pole|3\s*p(?:ole)?)\b/gi, 'TP');
  text = text.replace(/\b(?:four\s+pole|4\s*p(?:ole)?)\b/gi, '4-Pole');

  // 5. Common Unit Representations
  text = text.replace(/\b(?:coils?|c|bundle|roll|rolls)\b/gi, 'Coil (90m)');
  text = text.replace(/\b(?:nos?|pieces?|pcs?|units?)\b/gi, 'Nos');
  text = text.replace(/\b(?:pkts?|packs?)\b/gi, 'Pack');
  text = text.replace(/\b(?:boxes|box)\b/gi, 'Box');

  // Clean multiple whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Extracts structured line items (quantity, unit, description) from normalized line text.
 */
export function extractLineItem(rawLine: string): ExtractedLineItem | null {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.length < 3) return null;

  const normalized = normalizeOcrText(trimmed);

  let quantity = 1;
  let unit = 'Nos';
  let description = normalized;

  // Pattern 1: Trailing Quantity + Unit, e.g. "Anchor Roma 6A switch - 20 Nos" or "... : 4 Coils"
  const trailingMatch = normalized.match(
    /(?:[-–—:]|\s+x|\s+of)\s*(\d+(?:\.\d+)?)\s*(Nos|Coil \(90m\)|Coil|Pack|Box|Mtr|Pcs)?$/i
  );

  if (trailingMatch) {
    quantity = Math.max(1, Math.round(parseFloat(trailingMatch[1])));
    if (trailingMatch[2]) {
      unit = trailingMatch[2].toLowerCase().includes('coil') ? 'Coil (90m)' : trailingMatch[2];
    }
    description = normalized.slice(0, trailingMatch.index).replace(/[-–—:]\s*$/, '').trim();
  } else {
    // Pattern 2: Leading Quantity, e.g. "20 x Anchor 6A switch" or "4 Coils Polycab wire"
    const leadingMatch = normalized.match(
      /^(\d+(?:\.\d+)?)\s*(?:x\s*|\s*(Nos|Coil \(90m\)|Coil|Pack|Box|Mtr|Pcs)\s+(?:of\s+)?)(.+)$/i
    );

    if (leadingMatch) {
      quantity = Math.max(1, Math.round(parseFloat(leadingMatch[1])));
      if (leadingMatch[2]) {
        unit = leadingMatch[2].toLowerCase().includes('coil') ? 'Coil (90m)' : leadingMatch[2];
      }
      description = leadingMatch[3].trim();
    }
  }

  // Determine standard unit based on product type keywords if unit was generic
  if (unit === 'Nos') {
    if (description.toLowerCase().includes('wire') || description.toLowerCase().includes('cable')) {
      unit = 'Coil (90m)';
    } else if (description.toLowerCase().includes('pack of 10') || description.toLowerCase().includes('pack (10')) {
      unit = 'Pack (10 Nos)';
    } else if (description.toLowerCase().includes('box of 20') || description.toLowerCase().includes('box (20')) {
      unit = 'Box (20 Nos)';
    }
  }

  return {
    rawText: trimmed,
    normalizedText: description,
    quantity,
    unit,
    confidence: 'HIGH',
    confidenceScore: 1.0,
    matchStatus: 'AMBIGUOUS', // Pending hierarchical catalog matching
  };
}
