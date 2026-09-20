/**
 * ElectraKart Estimate Intelligence Service
 * Orchestrates file validation, OCR provider extraction, catalog matching,
 * customer clarification, and quotation generation.
 */

import { db } from '../../db/connection.js';
import { validateEstimateFile, sanitizeFilename } from './fileValidator.js';
import { getOcrProvider } from './ocr.provider.js';
import { extractLineItem } from './normalizer.js';
import { catalogMatchingService } from './matching.service.js';
import {
  ExtractedLineItem,
  EstimateProcessingStatus,
} from './ocr.types.js';

export interface ProcessEstimateInput {
  customerId: string;
  customerName: string;
  customerPhone: string;
  city?: string;
  pincode?: string;
  fileBuffer?: Buffer;
  filename?: string;
  mimeType?: string;
  sampleId?: string;
  rawCustomText?: string;
}

export class EstimateService {
  /**
   * Validates file, extracts OCR text, matches against canonical catalog, and persists estimate.
   */
  async uploadAndProcessEstimate(input: ProcessEstimateInput) {
    const {
      customerId,
      customerName,
      customerPhone,
      city = 'Vijayawada',
      pincode = '520002',
      fileBuffer,
      filename,
      mimeType,
      sampleId,
      rawCustomText,
    } = input;

    let sanitizedName = 'manual_entry.txt';
    let fileType: any = 'MANUAL_TEXT';
    let fileSize = 0;
    let bufferToProcess: Buffer;

    // 1. File Validation
    if (fileBuffer) {
      sanitizedName = sanitizeFilename(filename || 'uploaded_estimate.pdf');
      const validation = validateEstimateFile(fileBuffer, sanitizedName, mimeType);
      if (!validation.isValid) {
        const err: any = new Error(validation.error);
        err.statusCode = 400;
        throw err;
      }
      fileType = validation.fileType;
      fileSize = validation.sizeBytes;
      bufferToProcess = fileBuffer;
    } else if (rawCustomText) {
      bufferToProcess = Buffer.from(rawCustomText, 'utf-8');
      fileSize = bufferToProcess.length;
    } else if (sampleId) {
      sanitizedName = `${sampleId}.pdf`;
      bufferToProcess = Buffer.from(sampleId, 'utf-8');
      fileSize = bufferToProcess.length;
      fileType = 'PDF';
    } else {
      const err: any = new Error('No estimate file, sampleId, or text payload provided.');
      err.statusCode = 400;
      throw err;
    }

    // 2. OCR Text Extraction via Provider Abstraction
    const ocrProvider = getOcrProvider();
    const ocrResult = await ocrProvider.extractText(bufferToProcess, mimeType || 'application/pdf', sanitizedName);

    // 3. Line Item Extraction & Normalization
    const extractedLines: ExtractedLineItem[] = [];
    for (const line of ocrResult.lines) {
      const item = extractLineItem(line.text);
      if (item) {
        extractedLines.push(item);
      }
    }

    if (extractedLines.length === 0) {
      const err: any = new Error('No readable electrical items could be extracted from the document.');
      err.statusCode = 422;
      throw err;
    }

    // 4. Intelligent Hierarchical Catalog Matching
    const matchedItems = await catalogMatchingService.matchLineItems(extractedLines, city);

    // 5. Determine Overall Estimate Status
    const hasAmbiguous = matchedItems.some(
      (it) => it.matchStatus === 'NEEDS_CLARIFICATION' || it.matchStatus === 'AMBIGUOUS'
    );
    const hasExact = matchedItems.some((it) => it.matchStatus === 'EXACT_MATCH');
    const allExact = matchedItems.every((it) => it.matchStatus === 'EXACT_MATCH');

    let overallStatus: EstimateProcessingStatus = 'READY_FOR_QUOTE';
    if (hasAmbiguous) {
      overallStatus = hasExact ? 'PARTIALLY_RESOLVED' : 'NEEDS_CLARIFICATION';
    } else if (!allExact) {
      overallStatus = 'PARTIALLY_RESOLVED';
    }

    // 6. Persist Estimate & Line Items inside Atomic Transaction
    const estimateId = `est-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO estimates (
          id, customer_id, customer_name, customer_phone, file_name, file_type,
          file_size_bytes, ocr_provider, raw_text_payload, status, city, pincode,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          estimateId,
          customerId,
          customerName,
          customerPhone,
          sanitizedName,
          fileType,
          fileSize,
          ocrResult.provider,
          ocrResult.rawText,
          overallStatus,
          city,
          pincode,
        ]
      );

      for (let i = 0; i < matchedItems.length; i++) {
        const it = matchedItems[i];
        const itemId = `est-item-${estimateId}-${i + 1}`;
        it.id = itemId;

        await tx.query(
          `INSERT INTO estimate_items (
            id, estimate_id, raw_line_text, normalized_text, detected_quantity,
            detected_unit, detected_brand, detected_series, detected_config,
            detected_spec, confidence, confidence_score, match_status, matched_sku_id,
            matched_sku_code, candidate_options, matching_evidence,
            clarification_prompt, is_resolved_by_customer, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, FALSE, NOW())`,
          [
            itemId,
            estimateId,
            it.rawText,
            it.normalizedText,
            it.quantity,
            it.unit,
            it.detectedBrand || null,
            it.detectedSeries || null,
            it.detectedConfig || null,
            it.detectedSpec || null,
            it.confidence,
            it.confidenceScore,
            it.matchStatus,
            it.matchedSkuId || null,
            it.matchedSkuCode || null,
            JSON.stringify(it.candidateOptions || []),
            JSON.stringify(it.matchingEvidence || {}),
            it.clarificationPrompt || null,
          ]
        );
      }
    });

    return {
      estimateId,
      status: overallStatus,
      ocrProvider: ocrResult.provider,
      totalItemsExtracted: matchedItems.length,
      unresolvedCount: matchedItems.filter((i) => i.matchStatus !== 'EXACT_MATCH').length,
      items: matchedItems,
      city,
      pincode,
    };
  }

  /**
   * Retrieves an estimate by ID with strict IDOR ownership checks.
   */
  async getEstimateById(estimateId: string, requestingUser?: any) {
    const estRes = await db.query('SELECT * FROM estimates WHERE id = $1', [estimateId]);
    if (estRes.rows.length === 0) {
      const err: any = new Error(`Estimate '${estimateId}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const estimate = estRes.rows[0];

    // IDOR Protection: Customers can only access their own estimates
    if (
      requestingUser &&
      requestingUser.role === 'CUSTOMER' &&
      estimate.customer_id &&
      estimate.customer_id !== requestingUser.id
    ) {
      const err: any = new Error('Access denied: You do not have permission to view this estimate.');
      err.statusCode = 403;
      throw err;
    }

    const itemsRes = await db.query(
      `SELECT 
        ei.id,
        ei.raw_line_text AS "rawText",
        ei.normalized_text AS "normalizedText",
        ei.detected_quantity AS "quantity",
        ei.detected_unit AS "unit",
        ei.detected_brand AS "detectedBrand",
        ei.detected_series AS "detectedSeries",
        ei.detected_config AS "detectedConfig",
        ei.detected_spec AS "detectedSpec",
        ei.confidence,
        ei.confidence_score AS "confidenceScore",
        ei.match_status AS "matchStatus",
        ei.matched_sku_id AS "matchedSkuId",
        ei.matched_sku_code AS "matchedSkuCode",
        ei.candidate_options AS "candidateOptions",
        ei.matching_evidence AS "matchingEvidence",
        ei.clarification_prompt AS "clarificationPrompt",
        ei.is_resolved_by_customer AS "isResolved",
        s.name AS "productName",
        s.selling_price_inr AS "unitPrice"
       FROM estimate_items ei
       LEFT JOIN skus s ON ei.matched_sku_code = s.sku_code OR ei.matched_sku_id = s.id
       WHERE ei.estimate_id = $1
       ORDER BY ei.id ASC`,
      [estimateId]
    );

    return {
      ...estimate,
      items: itemsRes.rows,
    };
  }

  /**
   * Customer clarifies an ambiguous line item by selecting a legitimate catalog SKU.
   */
  async clarifyItem(
    estimateId: string,
    itemId: string,
    chosenSku: string,
    quantity?: number,
    requestingUser?: any
  ) {
    const est = await this.getEstimateById(estimateId, requestingUser);

    const skuRes = await db.query(
      'SELECT id, sku_code, name, selling_price_inr, specification FROM skus WHERE sku_code = $1 OR id = $1',
      [chosenSku]
    );

    if (skuRes.rows.length === 0) {
      const err: any = new Error(`Catalog SKU '${chosenSku}' not found in master catalog.`);
      err.statusCode = 400;
      throw err;
    }

    const sku = skuRes.rows[0];

    await db.query(
      `UPDATE estimate_items
       SET matched_sku_id = $1, matched_sku_code = $2, match_status = 'RESOLVED',
           confidence = 'HIGH', confidence_score = 1.0, is_resolved_by_customer = TRUE,
           detected_quantity = COALESCE($3, detected_quantity)
       WHERE id = $4 AND estimate_id = $5`,
      [sku.id, sku.sku_code, quantity, itemId, estimateId]
    );

    // Check if all items in estimate are now resolved
    const remainingRes = await db.query(
      `SELECT COUNT(*) as unresolved_count
       FROM estimate_items
       WHERE estimate_id = $1 AND match_status IN ('AMBIGUOUS', 'NEEDS_CLARIFICATION')`,
      [estimateId]
    );

    const unresolvedCount = parseInt(remainingRes.rows[0]?.unresolved_count || '0', 10);
    const newStatus = unresolvedCount === 0 ? 'READY_FOR_QUOTE' : 'PARTIALLY_RESOLVED';

    await db.query('UPDATE estimates SET status = $1, updated_at = NOW() WHERE id = $2', [
      newStatus,
      estimateId,
    ]);

    return {
      status: 'RESOLVED',
      estimateId,
      itemId,
      chosenSku: sku.sku_code,
      productName: sku.name,
      estimateStatus: newStatus,
      unresolvedRemaining: unresolvedCount,
    };
  }

  /**
   * Converts fully resolved estimate into authoritative 48-hour locked quotation.
   */
  async generateQuotationFromEstimate(
    estimateId: string,
    customerDetails: any,
    requestingUser?: any
  ) {
    const estimate = await this.getEstimateById(estimateId, requestingUser);

    // Gather valid items
    const validItems = estimate.items.filter((it: any) => it.matchedSkuCode || it.matchedSkuId);
    if (validItems.length === 0) {
      const err: any = new Error('Cannot generate quotation: no resolved items in estimate.');
      err.statusCode = 400;
      throw err;
    }

    const quoId = `quo-${Date.now()}`;
    const quotationNumber = `EK-QUO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    let subtotal = 0;
    const computedItems: any[] = [];

    for (const it of validItems) {
      const skuRes = await db.query(
        'SELECT id, name, brand_id, series_id, selling_price_inr, specification, unit_of_measure FROM skus WHERE sku_code = $1 OR id = $2',
        [it.matchedSkuCode, it.matchedSkuId]
      );
      const sku = skuRes.rows[0];
      const rate = parseFloat(sku?.selling_price_inr || it.unitPrice || 500);
      const qty = it.quantity || 1;
      const totalAmount = rate * qty;
      const gstAmount = Math.round(totalAmount * 0.18);

      computedItems.push({
        id: `q-item-${computedItems.length + 1}`,
        skuId: sku?.id || it.matchedSkuId,
        sku: sku?.sku_code || it.matchedSkuCode,
        name: sku?.name || it.productName,
        specification: sku?.specification || it.detectedSpec || '',
        quantity: qty,
        unit: sku?.unit_of_measure || it.unit || 'Nos',
        rate,
        gstPercent: 18,
        gstAmount,
        totalAmount: totalAmount + gstAmount,
      });

      subtotal += totalAmount;
    }

    const discount = subtotal > 20000 ? 1500 : 0;
    const gstTotal = Math.round((subtotal - discount) * 0.18);
    const deliveryFee = 0; // Free for locked quotation
    const grandTotal = subtotal - discount + gstTotal + deliveryFee;

    const lockedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48-Hour Price Lock Guarantee

    const quotation = await db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO quotations (
          id, quotation_number, estimate_id, customer_id, customer_name, customer_phone,
          delivery_address, city, pincode, subtotal_inr, discount_inr, delivery_fee_inr,
          gst_total_inr, grand_total_inr, is_price_locked, locked_until_timestamp, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, TRUE, $15, 'LOCKED', NOW())`,
        [
          quoId,
          quotationNumber,
          estimateId,
          estimate.customer_id || customerDetails?.customerId || 'usr-customer-1',
          customerDetails?.customerName || estimate.customer_name || 'Anil Kumar Reddy',
          customerDetails?.customerPhone || estimate.customer_phone || '+91 98481 99882',
          customerDetails?.deliveryAddress || 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
          estimate.city || 'Vijayawada',
          estimate.pincode || '520002',
          subtotal,
          discount,
          deliveryFee,
          gstTotal,
          grandTotal,
          lockedUntil,
        ]
      );

      for (const qItem of computedItems) {
        await tx.query(
          `INSERT INTO quotation_items (
            id, quotation_id, sku_id, sku_code, product_name, brand_name, series_name,
            specification_details, quantity, unit, unit_rate_inr, gst_rate_percent,
            gst_amount_inr, line_total_inr
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 18.00, $12, $13)`,
          [
            qItem.id,
            quoId,
            qItem.skuId,
            qItem.sku,
            qItem.name,
            'Verified Brand',
            'Verified Series',
            qItem.specification,
            qItem.quantity,
            qItem.unit,
            qItem.rate,
            qItem.gstAmount,
            qItem.totalAmount,
          ]
        );
      }

      await tx.query("UPDATE estimates SET status = 'QUOTED', updated_at = NOW() WHERE id = $1", [
        estimateId,
      ]);

      return {
        id: quoId,
        quotationNumber,
        estimateId,
        subtotalInr: subtotal,
        discountInr: discount,
        gstTotalInr: gstTotal,
        grandTotalInr: grandTotal,
        isPriceLocked: true,
        lockedUntilTimestamp: lockedUntil.toISOString(),
        status: 'LOCKED',
        items: computedItems,
      };
    });

    return quotation;
  }
}

export const estimateService = new EstimateService();
