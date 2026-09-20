/**
 * ElectraKart Mock OCR Provider
 * Deterministic, high-fidelity simulator for local testing and CI/CD pipelines.
 * STRICTLY PROHIBITED IN PRODUCTION.
 */

import { IOcrProvider, OcrExtractionResult, ExtractedOcrLine } from '../ocr.types.js';

export const MOCK_FIXTURES: Record<string, string> = {
  // Fixture A: Exact brand + series + specification -> EXACT MATCH
  fixture_a_exact: `
1. Polycab FlameX FR 2.5 sq mm red wire - 3 Coils
2. Anchor Roma Classic 6-Module Plate with Base Frame White - 6 Nos
3. Legrand Arteor 16A Shuttered Socket Magnesium - 4 Nos
  `.trim(),

  // Fixture B: Brand known, series missing -> NEEDS CLARIFICATION (Roma vs Penta)
  fixture_b_clarification: `
1. Anchor 6A 1-way switch - 20 Nos
2. Polycab FlameX FR 1.5 sq mm yellow wire - 2 Coils
  `.trim(),

  // Fixture C: Multiple series candidates -> AMBIGUOUS
  fixture_c_ambiguous: `
1. Schneider 16A circuit breaker - 10 Nos
2. Havells 1200mm ceiling fan - 2 Nos
  `.trim(),

  // Fixture D: Unknown product -> NO MATCH
  fixture_d_nomatch: `
1. SuperPower Quantum Laser Inverter 9999W - 1 No
2. Unknown Brand Nonexistent 99A Switch - 15 Nos
  `.trim(),

  // Fixture E: Mixed multi-item estimate -> PARTIAL RESOLUTION
  fixture_e_mixed: `
1. Polycab FlameX FR 2.5 sq mm red wire - 4 Coils
2. Anchor 6A switch - 25 Nos
3. Legrand Arteor 16A Shuttered Socket Magnesium - 4 Nos
4. SuperPower Quantum Laser Inverter 9999W - 1 No
  `.trim(),

  // Fixture F: Stock shortage test -> UNAVAILABLE stock status
  fixture_f_shortage: `
1. Polycab 63A 4 pole 30mA RCCB - 500 Nos
  `.trim(),

  // Realistic Contractor Estimate 1 (Residential)
  estimate_sample_1: `
Polycab 2.5 sq mm red wire - 3 Coils
Polycab 1.5 sq mm yellow wire - 2 Coils
Anchor 6A switch - 20 Nos
Anchor Roma 6 module plate with frame - 6 Nos
Legrand 16A shutter socket - 4 Nos
Havells 1200mm ceiling fan - 3 Nos
Schneider 16A SP MCB - 6 Nos
Polycab 63A 4 pole 30mA RCCB - 1 No
  `.trim(),

  // Commercial Contractor Estimate 2
  estimate_sample_2: `
Finolex FRLSH 1.5 sq mm blue wire - 6 Coils
Finolex 4.0 sq mm green earth wire - 2 Coils
Anchor Roma 8 module plate - 8 Nos
Anchor Roma 6A 1-way modular switch - 40 Nos
Philips 15W round LED panel light - 12 Nos
Schneider Acti9 16A MCB - 10 Nos
  `.trim(),
};

export class MockOcrProvider implements IOcrProvider {
  async extractText(
    buffer: Buffer,
    _mimeType: string,
    filename: string
  ): Promise<OcrExtractionResult> {
    const rawBufferStr = buffer.toString('utf-8');
    const lowerFilename = filename.toLowerCase();

    // Check if filename references a named test fixture
    let content = '';
    for (const [key, text] of Object.entries(MOCK_FIXTURES)) {
      if (lowerFilename.includes(key)) {
        content = text;
        break;
      }
    }

    // If not matched by filename, check if buffer itself contains readable ASCII content (e.g. rawCustomText)
    if (!content) {
      if (
        rawBufferStr &&
        !rawBufferStr.startsWith('%PDF') &&
        !rawBufferStr.startsWith('\x89PNG') &&
        rawBufferStr.trim().length > 3
      ) {
        content = rawBufferStr;
      } else if (lowerFilename.includes('commercial') || lowerFilename.includes('sample-2')) {
        content = MOCK_FIXTURES.estimate_sample_2;
      } else {
        // Default realistic contractor bill
        content = MOCK_FIXTURES.estimate_sample_1;
      }
    }

    // Split text into lines
    const rawLines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const lines: ExtractedOcrLine[] = rawLines.map((text, idx) => ({
      text,
      lineNumber: idx + 1,
      confidence: 0.98,
      boundingBox: {
        x: 10,
        y: 20 * (idx + 1),
        width: 400,
        height: 18,
      },
    }));

    return {
      rawText: content,
      lines,
      provider: 'MOCK',
      confidenceScore: 0.96,
      metadata: {
        simulated: true,
        fixtureMatched: lowerFilename,
        lineCount: lines.length,
      },
    };
  }
}
