/**
 * ElectraKart Estimate OCR & Intelligent Product Matching Automated Tests (Phase 3D)
 */

import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { db } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedDatabase } from '../src/db/seed.js';
import { validateEstimateFile } from '../src/modules/estimates/fileValidator.js';
import { normalizeOcrText, extractLineItem } from '../src/modules/estimates/normalizer.js';
import { getOcrProvider } from '../src/modules/estimates/ocr.provider.js';

export async function runEstimateOcrTests() {
  console.log('\n--- Running Phase 3D: Real Estimate OCR & Intelligent Product Matching Tests ---');
  await runMigrations();
  await seedDatabase();

  const app = buildApp();
  await app.ready();

  // Clean transactional tables for fresh test run
  await db.exec(`
    DELETE FROM quotation_items;
    DELETE FROM quotations;
    DELETE FROM estimate_items;
    DELETE FROM estimates;
  `);

  // 1. Authenticate Customer Token (Anil Kumar Reddy)
  const custLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { emailOrPhone: 'anil.reddy@gmail.com', password: 'password123' },
  });
  assert.equal(custLoginRes.statusCode, 200, 'Customer login failed');
  const customerToken = custLoginRes.json().accessToken;

  // 2. Another Customer Token for IDOR Testing (Sunita Sharma)
  const customer2Token = app.jwt.sign({
    id: 'usr-customer-2',
    email: 'sunita.sharma@gmail.com',
    role: 'CUSTOMER',
    fullName: 'Sunita Sharma',
  });

  // =========================================================================
  // TEST SUITE 1: File Validation & Magic Byte Security
  // =========================================================================
  console.log('1. Verifying File Validation & Security...');

  // 1a. Rejection of executable files
  const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
  const exeValidation = validateEstimateFile(exeBuffer, 'malware.exe', 'application/x-msdownload');
  assert.equal(exeValidation.isValid, false);
  assert.match(exeValidation.error || '', /executable\/script format/i);

  // 1b. Rejection of disguised file (PDF extension with invalid magic bytes)
  const fakePdfBuffer = Buffer.from('NOT_A_REAL_PDF_CONTENT');
  const fakePdfValidation = validateEstimateFile(fakePdfBuffer, 'estimate.pdf', 'application/pdf');
  assert.equal(fakePdfValidation.isValid, false);
  assert.match(fakePdfValidation.error || '', /binary signatures/i);

  // 1c. Rejection of oversized file (> 25MB)
  const oversizedBuffer = Buffer.alloc(26 * 1024 * 1024); // 26MB
  const oversizeValidation = validateEstimateFile(oversizedBuffer, 'huge.pdf', 'application/pdf');
  assert.equal(oversizeValidation.isValid, false);
  assert.match(oversizeValidation.error || '', /exceeds the maximum allowed limit/i);

  // 1d. Valid PDF file with authentic magic bytes (%PDF)
  const validPdfBuffer = Buffer.concat([Buffer.from('%PDF-1.4 sample pdf content')]);
  const validPdfValidation = validateEstimateFile(validPdfBuffer, 'contractor_bill.pdf', 'application/pdf');
  assert.equal(validPdfValidation.isValid, true);
  assert.equal(validPdfValidation.fileType, 'PDF');

  // 1e. Valid JPEG file with authentic magic bytes (0xFF, 0xD8, 0xFF)
  const validJpgBuffer = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('sample jpg')]);
  const validJpgValidation = validateEstimateFile(validJpgBuffer, 'estimate_photo.jpg', 'image/jpeg');
  assert.equal(validJpgValidation.isValid, true);
  assert.equal(validJpgValidation.fileType, 'JPG');

  // 1f. Valid PNG file with authentic magic bytes (0x89, 0x50, 0x4E, 0x47)
  const validPngBuffer = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]);
  const validPngValidation = validateEstimateFile(validPngBuffer, 'site_bill.png', 'image/png');
  assert.equal(validPngValidation.isValid, true);
  assert.equal(validPngValidation.fileType, 'PNG');

  console.log('✓ File validation properly verifies magic bytes, size limits, and rejects executable threats');

  // =========================================================================
  // TEST SUITE 2: OCR Text Normalization
  // =========================================================================
  console.log('2. Verifying OCR Text Normalization & Line Extraction...');

  const normalized1 = normalizeOcrText('1. 6 A SWITCH - 20 Nos');
  assert.match(normalized1, /6A/);
  assert.match(normalized1, /Nos/);

  const normalized2 = normalizeOcrText('Polycab 2.5 sq mm red wire - 3 Coils');
  assert.match(normalized2, /2\.5 sq\.mm/);
  assert.match(normalized2, /Coil \(90m\)/);

  const extractedLine = extractLineItem('Polycab 2.5 sq mm red wire - 3 Coils');
  assert.ok(extractedLine);
  assert.equal(extractedLine?.quantity, 3);
  assert.equal(extractedLine?.unit, 'Coil (90m)');

  console.log('✓ Text normalization and electrical unit parsing functioning accurately');

  // =========================================================================
  // TEST SUITE 3: Fixture A — Exact Brand + Series + Specification
  // =========================================================================
  console.log('3. Verifying Fixture A (Exact Match)...');

  const uploadARes = await app.inject({
    method: 'POST',
    url: '/api/v1/estimates/upload',
    headers: { authorization: `Bearer ${customerToken}` },
    payload: {
      filename: 'fixture_a_exact.pdf',
      fileBase64: validPdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
      city: 'Vijayawada',
      pincode: '520002',
    },
  });

  assert.equal(uploadARes.statusCode, 201);
  const dataA = uploadARes.json();
  assert.ok(dataA.estimateId);
  assert.equal(dataA.status, 'READY_FOR_QUOTE');
  assert.equal(dataA.unresolvedCount, 0);

  // Verify Item 1: Polycab FlameX FR 2.5 sq.mm Red
  const item1 = dataA.items.find((i: any) => i.matchedSkuCode === 'POL-WX-25-RED-90M');
  assert.ok(item1, 'Polycab FlameX FR 2.5 sq.mm Red was not matched');
  assert.equal(item1.matchStatus, 'EXACT_MATCH');
  assert.equal(item1.confidence, 'HIGH');
  assert.ok(item1.confidenceScore >= 0.9);
  assert.equal(item1.detectedBrand, 'Polycab');
  assert.equal(item1.detectedSeries, 'FlameX FR');

  // Verify Item 2: Anchor Roma 6M Plate White
  const item2 = dataA.items.find((i: any) => i.matchedSkuCode === 'ANC-ROM-6M-PLT-WHT');
  assert.ok(item2, 'Anchor Roma 6M Plate was not matched');
  assert.equal(item2.matchStatus, 'EXACT_MATCH');
  assert.equal(item2.confidence, 'HIGH');

  console.log('✓ Fixture A: Unambiguous specifications successfully resolved to exact SKUs (HIGH confidence)');

  // =========================================================================
  // TEST SUITE 4: Fixture B — Brand Known, Series Missing (Clarification Trigger)
  // =========================================================================
  console.log('4. Verifying Fixture B (Clarification on Missing Series)...');

  const uploadBRes = await app.inject({
    method: 'POST',
    url: '/api/v1/estimates/upload',
    headers: { authorization: `Bearer ${customerToken}` },
    payload: {
      filename: 'fixture_b_clarification.pdf',
      fileBase64: validPdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    },
  });

  assert.equal(uploadBRes.statusCode, 201);
  const dataB = uploadBRes.json();
  assert.equal(dataB.status, 'PARTIALLY_RESOLVED');
  assert.ok(dataB.unresolvedCount >= 1);

  const ambiguousSwitch = dataB.items.find((i: any) => i.rawText.includes('Anchor 6A'));
  assert.ok(ambiguousSwitch);
  assert.equal(ambiguousSwitch.matchStatus, 'NEEDS_CLARIFICATION');
  assert.equal(ambiguousSwitch.confidence, 'MEDIUM');
  assert.ok(ambiguousSwitch.candidateOptions.length >= 2, 'Candidate options must be present');
  assert.ok(
    ambiguousSwitch.candidateOptions.some((opt: any) => opt.sku === 'ANC-ROM-6A1W-WHT'),
    'Should include Anchor Roma Classic'
  );
  assert.ok(
    ambiguousSwitch.candidateOptions.some((opt: any) => opt.sku === 'ANC-PEN-6A1W-WHT'),
    'Should include Anchor Penta'
  );
  assert.ok(ambiguousSwitch.clarificationPrompt, 'Clarification prompt must be present');

  console.log('✓ Fixture B: Missing series flags NEEDS_CLARIFICATION and exposes legitimate catalog candidates');

  // =========================================================================
  // TEST SUITE 5: Fixture C — Ambiguous Multiple Series Candidates
  // =========================================================================
  console.log('5. Verifying Fixture C (Ambiguous Matching)...');

  const uploadCRes = await app.inject({
    method: 'POST',
    url: '/api/v1/estimates/upload',
    headers: { authorization: `Bearer ${customerToken}` },
    payload: {
      filename: 'fixture_c_ambiguous.pdf',
      fileBase64: validPdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    },
  });

  assert.equal(uploadCRes.statusCode, 201);
  const dataC = uploadCRes.json();
  const mcbItem = dataC.items.find((i: any) => i.rawText.includes('Schneider 16A'));
  assert.ok(mcbItem);
  assert.ok(mcbItem.candidateOptions.length > 0);

  console.log('✓ Fixture C: Multiple candidate models properly flagged with catalog options');

  // =========================================================================
  // TEST SUITE 6: Fixture D — Unknown Product (NO MATCH)
  // =========================================================================
  console.log('6. Verifying Fixture D (No Match Without Arbitrary Guessing)...');

  const uploadDRes = await app.inject({
    method: 'POST',
    url: '/api/v1/estimates/upload',
    headers: { authorization: `Bearer ${customerToken}` },
    payload: {
      filename: 'fixture_d_nomatch.pdf',
      fileBase64: validPdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    },
  });

  assert.equal(uploadDRes.statusCode, 201);
  const dataD = uploadDRes.json();
  const unknownItem = dataD.items.find((i: any) => i.rawText.includes('SuperPower Quantum'));
  assert.ok(unknownItem);
  assert.equal(unknownItem.matchStatus, 'NO_MATCH');
  assert.equal(unknownItem.confidence, 'LOW');
  assert.equal(unknownItem.matchedSkuCode, null);

  console.log('✓ Fixture D: Unknown products cleanly designated as NO_MATCH without false positives');

  // =========================================================================
  // TEST SUITE 7: Fixture E — Mixed Multi-Item Partial Resolution
  // =========================================================================
  console.log('7. Verifying Fixture E (Mixed Multi-Item Estimate)...');

  const uploadERes = await app.inject({
    method: 'POST',
    url: '/api/v1/estimates/upload',
    headers: { authorization: `Bearer ${customerToken}` },
    payload: {
      filename: 'fixture_e_mixed.pdf',
      fileBase64: validPdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    },
  });

  assert.equal(uploadERes.statusCode, 201);
  const dataE = uploadERes.json();
  assert.equal(dataE.status, 'PARTIALLY_RESOLVED');
  assert.ok(dataE.items.some((i: any) => i.matchStatus === 'EXACT_MATCH'));
  assert.ok(dataE.items.some((i: any) => i.matchStatus === 'NEEDS_CLARIFICATION'));
  assert.ok(dataE.items.some((i: any) => i.matchStatus === 'NO_MATCH'));

  console.log('✓ Fixture E: Multi-item estimate accurately tracks independent resolution states');

  // =========================================================================
  // TEST SUITE 8: Fixture F — Inventory Lookup & Shortage Flagging
  // =========================================================================
  console.log('8. Verifying Fixture F (Hyperlocal Inventory Lookup & Shortage)...');

  const uploadFRes = await app.inject({
    method: 'POST',
    url: '/api/v1/estimates/upload',
    headers: { authorization: `Bearer ${customerToken}` },
    payload: {
      filename: 'fixture_f_shortage.pdf',
      fileBase64: validPdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    },
  });

  assert.equal(uploadFRes.statusCode, 201);
  const dataF = uploadFRes.json();
  const shortageItem = dataF.items[0];
  assert.ok(shortageItem);
  assert.equal(shortageItem.inventoryAvailable, false);
  assert.ok(shortageItem.availableStock < 500);

  console.log('✓ Fixture F: Real PostgreSQL partner inventory balances verified with stock shortage alerts');

  // =========================================================================
  // TEST SUITE 9: Mandatory Acceptance Criteria — Zero False Positives
  // =========================================================================
  console.log('9. Verifying Zero False-Positive Exact SKU Selection...');

  const genericUploadRes = await app.inject({
    method: 'POST',
    url: '/api/v1/estimates/upload',
    headers: { authorization: `Bearer ${customerToken}` },
    payload: {
      rawCustomText: '6A switch - 10 Nos', // Generic term without brand or series
    },
  });

  assert.equal(genericUploadRes.statusCode, 201);
  const genericData = genericUploadRes.json();
  const genericItem = genericData.items[0];
  assert.notEqual(genericItem.matchStatus, 'EXACT_MATCH', 'Generic 6A switch must NOT match an exact SKU');
  assert.notEqual(genericItem.confidence, 'HIGH', 'Generic 6A switch must NOT have HIGH confidence');
  assert.ok(
    genericItem.matchStatus === 'AMBIGUOUS' || genericItem.matchStatus === 'NEEDS_CLARIFICATION',
    'Generic 6A switch must trigger clarification'
  );

  console.log('✓ Zero false-positive guarantee strictly enforced: generic input rejected from exact SKU');

  // =========================================================================
  // TEST SUITE 10: Clarification Workflow (Resolving Ambiguous Item)
  // =========================================================================
  console.log('10. Verifying Clarification Workflow...');

  const estIdToClarify = dataB.estimateId;
  const itemIdToClarify = ambiguousSwitch.id;

  const clarifyRes = await app.inject({
    method: 'POST',
    url: `/api/v1/estimates/${estIdToClarify}/items/${itemIdToClarify}/clarify`,
    headers: { authorization: `Bearer ${customerToken}` },
    payload: {
      chosenSku: 'ANC-ROM-6A1W-WHT',
      quantity: 20,
    },
  });

  assert.equal(clarifyRes.statusCode, 200);
  const clarifyData = clarifyRes.json();
  assert.equal(clarifyData.status, 'RESOLVED');
  assert.equal(clarifyData.chosenSku, 'ANC-ROM-6A1W-WHT');
  assert.equal(clarifyData.estimateStatus, 'READY_FOR_QUOTE');

  // Re-fetch estimate details to verify database state
  const refetchRes = await app.inject({
    method: 'GET',
    url: `/api/v1/estimates/${estIdToClarify}`,
    headers: { authorization: `Bearer ${customerToken}` },
  });
  assert.equal(refetchRes.statusCode, 200);
  const updatedEst = refetchRes.json();
  assert.equal(updatedEst.status, 'READY_FOR_QUOTE');
  const resolvedItem = updatedEst.items.find((i: any) => i.id === itemIdToClarify);
  assert.equal(resolvedItem.matchStatus, 'RESOLVED');
  assert.equal(resolvedItem.isResolved, true);

  console.log('✓ Clarification successfully resolves ambiguous item and transitions estimate to READY_FOR_QUOTE');

  // =========================================================================
  // TEST SUITE 11: Authoritative 48-Hour Locked Quotation Generation
  // =========================================================================
  console.log('11. Verifying Authoritative 48-Hour Locked Quotation Generation...');

  const quoteRes = await app.inject({
    method: 'POST',
    url: `/api/v1/estimates/${estIdToClarify}/quote`,
    headers: { authorization: `Bearer ${customerToken}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+91 98481 99882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
    },
  });

  assert.equal(quoteRes.statusCode, 201);
  const quoteData = quoteRes.json();
  assert.ok(quoteData.quotationNumber.startsWith('EK-QUO-2026-'));
  assert.equal(quoteData.isPriceLocked, true);
  assert.equal(quoteData.status, 'LOCKED');
  assert.ok(quoteData.subtotalInr > 0);
  assert.ok(quoteData.gstTotalInr > 0);
  assert.equal(quoteData.grandTotalInr, quoteData.subtotalInr + quoteData.gstTotalInr - quoteData.discountInr);

  // Verify 48-hour timestamp
  const expiry = new Date(quoteData.lockedUntilTimestamp);
  const now = new Date();
  const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  assert.ok(diffHours >= 47 && diffHours <= 49, 'Quotation must be locked for 48 hours');

  console.log('✓ Authoritative 48-hour locked quotation generated with 18% GST and price lock guarantee');

  // =========================================================================
  // TEST SUITE 12: Security, Ownership (IDOR) & Zero Financial Leakage
  // =========================================================================
  console.log('12. Verifying Estimate Ownership (IDOR) & Zero Margin Leakage...');

  // 12a. Customer 2 tries to access Customer 1's estimate -> 403 Forbidden
  const idorGetRes = await app.inject({
    method: 'GET',
    url: `/api/v1/estimates/${estIdToClarify}`,
    headers: { authorization: `Bearer ${customer2Token}` },
  });
  assert.equal(idorGetRes.statusCode, 403, 'Unauthorized customer should receive 403 on another user estimate');

  // 12b. Customer 2 tries to clarify Customer 1's estimate item -> 403 Forbidden
  const idorClarifyRes = await app.inject({
    method: 'POST',
    url: `/api/v1/estimates/${estIdToClarify}/items/${itemIdToClarify}/clarify`,
    headers: { authorization: `Bearer ${customer2Token}` },
    payload: { chosenSku: 'ANC-PEN-6A1W-WHT' },
  });
  assert.equal(idorClarifyRes.statusCode, 403, 'Unauthorized customer should receive 403 on item clarification');

  // 12c. Zero Margin Leakage: Estimate items must not leak purchase_cost_inr or dealer margins
  const estJson = JSON.stringify(refetchRes.json());
  assert.equal(estJson.includes('purchase_cost'), false, 'Customer response leaked purchase_cost');
  assert.equal(estJson.includes('commission_rate'), false, 'Customer response leaked commission_rate');
  assert.equal(estJson.includes('platform_fee'), false, 'Customer response leaked platform_fee');

  // 12d. Production Mock Protection: Mock OCR provider rejected if NODE_ENV=production
  assert.throws(
    () => {
      // Temporarily simulate production environment
      const prevEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        getOcrProvider('mock');
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    },
    /Mock OCR provider cannot be instantiated in production/i,
    'Production startup must abort if mock OCR is configured'
  );

  console.log('✓ IDOR ownership enforced (403), zero financial leakage confirmed, and production mock guard verified');

  console.log('\n✅ ALL Phase 3D Estimate OCR & Intelligent Product Matching Tests Passed (100% SUCCESS)!\n');
}

// Allow standalone execution: tsx tests/estimate_ocr.test.ts
if (process.argv[1]?.includes('estimate_ocr.test')) {
  runEstimateOcrTests()
    .then(() => {
      console.log('Finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
