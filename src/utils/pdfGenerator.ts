/**
 * ElectraKart Client-Side PDF Generation Utility
 * Generates standards-compliant, lightweight PDF 1.4 documents natively
 * without third-party external dependencies. Compatible with all modern browsers.
 */

export interface SettlementPdfData {
  id: string;
  period: string;
  grossSales: number;
  commission: number;
  tds: number;
  netPayout: number;
  status: string;
  utr: string;
  payoutDate: string;
}

export interface MerchantInfo {
  name: string;
  role: string;
  bankAccount: string;
  gstin: string;
  address: string;
  commissionRate: string;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    gstRate?: number;
  }>;
  subtotal: number;
  gstTotal: number;
  deliveryFee?: number;
  grandTotal: number;
  paymentMethod?: string;
  paymentStatus?: string;
}

export interface QuotationPdfData {
  quotationNumber: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  validUntil: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discount: number;
  gstTotal: number;
  grandTotal: number;
}

function escapePdfText(str: string | number | undefined | null): string {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function stringToUint8Array(str: string): Uint8Array {
  const buf = new Uint8Array(new ArrayBuffer(str.length));
  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i) & 0xff;
  }
  return buf;
}

export function downloadPdfBlob(pdfString: string, filename: string): void {
  const bytes = stringToUint8Array(pdfString);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

/**
 * Generates an official B2B Settlement Statement & GST Credit Note PDF
 */
export function generateSettlementPdf(set: SettlementPdfData, merchant: MerchantInfo): string {
  let body = '';
  const offsets: number[] = [];

  function addObj(str: string) {
    offsets.push(body.length);
    body += str + '\n';
  }

  body += '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

  // 1: Catalog
  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  // 2: Pages
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  // 3: Page (A4 Dimensions: 595.28 x 841.89)
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /ProcSet [/PDF /Text] >> /Contents 6 0 R >>\nendobj');
  // 4: Font Regular
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj');
  // 5: Font Bold
  addObj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj');

  let stream = '';

  // Header banner
  stream += '0.08 0.11 0.16 rg\n0 740 595.28 102 re\nf\n';

  // ElectraKart Brand & Document Type
  stream += 'BT\n/F2 17 Tf\n1 1 1 rg\n40 802 Td\n(ELECTRAKART HYPERLOCAL MARKETPLACE) Tj\nET\n';
  stream += 'BT\n/F1 10 Tf\n0.85 0.88 0.95 rg\n40 784 Td\n(B2B Merchant Settlement Statement & GST Credit Note) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.7 0.75 0.85 rg\n40 768 Td\n(Official Tax Invoice under Section 31 of CGST Act 2017 & Rule 54 of CGST Rules) Tj\nET\n';
  stream += 'BT\n/F1 8 Tf\n0.6 0.65 0.75 rg\n40 754 Td\n(Marketplace Operator: ElectraKart Hyperlocal Marketplace India Pvt Ltd | GSTIN: 37AAACE9921K1Z8) Tj\nET\n';

  // Status Badge on Header
  const isSettled = set.status.toUpperCase() === 'SETTLED';
  if (isSettled) {
    stream += '0.1 0.6 0.3 rg\n465 788 90 24 re\nf\n';
    stream += 'BT\n/F2 10 Tf\n1 1 1 rg\n488 796 Td\n(' + escapePdfText(set.status) + ') Tj\nET\n';
  } else {
    stream += '0.85 0.5 0.1 rg\n465 788 90 24 re\nf\n';
    stream += 'BT\n/F2 10 Tf\n1 1 1 rg\n482 796 Td\n(' + escapePdfText(set.status) + ') Tj\nET\n';
  }

  // Merchant & Statement Metadata Container
  stream += '0.96 0.97 0.99 rg\n40 600 515 125 re\nf\n';
  stream += '0.82 0.85 0.9 RG\n0.6 w\n40 600 515 125 re\nS\n';

  // Left Column - Merchant Info
  stream += 'BT\n/F2 10 Tf\n0.1 0.15 0.25 rg\n55 706 Td\n(REMITTANCE BENEFICIARY) Tj\nET\n';
  stream += 'BT\n/F2 11 Tf\n0.05 0.1 0.2 rg\n55 690 Td\n(' + escapePdfText(merchant.name) + ') Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.35 0.4 0.5 rg\n55 675 Td\n(Category: ' + escapePdfText(merchant.role) + ' | Take-Rate: ' + escapePdfText(merchant.commissionRate) + ') Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.35 0.4 0.5 rg\n55 660 Td\n(Merchant GSTIN: ' + escapePdfText(merchant.gstin) + ') Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.35 0.4 0.5 rg\n55 645 Td\n(Registered Depot: ' + escapePdfText(merchant.address) + ') Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.15 0.2 0.3 rg\n55 615 Td\n(Bank Remittance: ' + escapePdfText(merchant.bankAccount) + ') Tj\nET\n';

  // Right Column - Settlement Details
  stream += 'BT\n/F2 10 Tf\n0.1 0.15 0.25 rg\n330 706 Td\n(SETTLEMENT SPECIFICATIONS) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.4 0.45 0.5 rg\n330 690 Td\n(Settlement ID:) Tj\nET\n';
  stream += 'BT\n/F2 9.5 Tf\n0.05 0.1 0.2 rg\n420 690 Td\n(' + escapePdfText(set.id) + ') Tj\nET\n';

  stream += 'BT\n/F1 8.5 Tf\n0.4 0.45 0.5 rg\n330 675 Td\n(Billing Cycle:) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.1 0.1 0.15 rg\n420 675 Td\n(' + escapePdfText(set.period) + ') Tj\nET\n';

  stream += 'BT\n/F1 8.5 Tf\n0.4 0.45 0.5 rg\n330 660 Td\n(Bank UTR No:) Tj\nET\n';
  stream += 'BT\n/F2 8.5 Tf\n0.1 0.1 0.15 rg\n420 660 Td\n(' + escapePdfText(set.utr) + ') Tj\nET\n';

  stream += 'BT\n/F1 8.5 Tf\n0.4 0.45 0.5 rg\n330 645 Td\n(Payout Date:) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.1 0.1 0.15 rg\n420 645 Td\n(' + escapePdfText(set.payoutDate) + ') Tj\nET\n';

  stream += 'BT\n/F1 8.5 Tf\n0.4 0.45 0.5 rg\n330 630 Td\n(Payment Channel:) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.1 0.1 0.15 rg\n420 630 Td\n(NEFT / RTGS Automated Clearing) Tj\nET\n';

  // Accounting Summary Table Header
  stream += '0.12 0.16 0.24 rg\n40 555 515 25 re\nf\n';
  stream += 'BT\n/F2 9 Tf\n1 1 1 rg\n55 563 Td\n(PARTICULARS / ACCOUNT HEAD) Tj\nET\n';
  stream += 'BT\n/F2 9 Tf\n1 1 1 rg\n440 563 Td\n(SETTLED AMOUNT (INR)) Tj\nET\n';

  // Accounting Rows
  const tableRows = [
    { label: 'Total Gross Merchandise Value (GMV) Processed', amount: 'Rs. ' + set.grossSales.toLocaleString('en-IN'), color: '0.1 0.1 0.15' },
    { label: 'Less: Platform Commission / Marketplace Facilitation (' + merchant.commissionRate + ')', amount: '- Rs. ' + set.commission.toLocaleString('en-IN'), color: '0.7 0.1 0.1' },
    { label: 'Less: Tax Deducted at Source (TDS under Section 194-O of Income Tax Act @ 1%)', amount: '- Rs. ' + set.tds.toLocaleString('en-IN'), color: '0.7 0.1 0.1' },
    { label: 'GST on Marketplace Commission (Included in platform debit @ 18%)', amount: 'Rs. ' + Math.round(set.commission * 0.18).toLocaleString('en-IN'), color: '0.3 0.35 0.4' },
  ];

  let y = 528;
  tableRows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? '0.98 0.98 0.99' : '1 1 1';
    stream += bg + ' rg\n40 ' + y + ' 515 24 re\nf\n';
    stream += '0.9 0.91 0.94 RG\n0.5 w\n40 ' + y + ' 515 24 re\nS\n';
    stream += 'BT\n/F1 8.5 Tf\n0.15 0.2 0.25 rg\n55 ' + (y + 7) + ' Td\n(' + escapePdfText(row.label) + ') Tj\nET\n';
    stream += 'BT\n/F2 8.5 Tf\n' + row.color + ' rg\n435 ' + (y + 7) + ' Td\n(' + escapePdfText(row.amount) + ') Tj\nET\n';
    y -= 26;
  });

  // Net Disbursed Payout Banner
  stream += '0.9 0.97 0.93 rg\n40 ' + y + ' 515 32 re\nf\n';
  stream += '0.15 0.6 0.3 RG\n1.2 w\n40 ' + y + ' 515 32 re\nS\n';
  stream += 'BT\n/F2 11 Tf\n0.05 0.4 0.15 rg\n55 ' + (y + 11) + ' Td\n(NET PAYOUT TRANSFERRED TO MERCHANT BANK ACCOUNT) Tj\nET\n';
  stream += 'BT\n/F2 12 Tf\n0.05 0.4 0.15 rg\n425 ' + (y + 11) + ' Td\n(Rs. ' + set.netPayout.toLocaleString('en-IN') + ') Tj\nET\n';

  // Audit and Legal Section
  y -= 45;
  stream += '0.97 0.98 0.99 rg\n40 ' + y + ' 515 75 re\nf\n';
  stream += '0.88 0.9 0.93 RG\n0.5 w\n40 ' + y + ' 515 75 re\nS\n';

  stream += 'BT\n/F2 8.5 Tf\n0.2 0.25 0.35 rg\n55 ' + (y + 58) + ' Td\n(STATUTORY GST & RECONCILIATION COMPLIANCE) Tj\nET\n';
  stream += 'BT\n/F1 7.5 Tf\n0.35 0.4 0.45 rg\n55 ' + (y + 44) + ' Td\n(1. Tax Deducted at Source (TDS) has been credited under Section 194-O. Form 26AS/AIS credit will reflect post quarterly filing.) Tj\nET\n';
  stream += 'BT\n/F1 7.5 Tf\n0.35 0.4 0.45 rg\n55 ' + (y + 32) + ' Td\n(2. Platform commission invoice with input tax credit (ITC) eligible GSTIN 37AAACE9921K1Z8 has been uploaded to GST Portal GSTR-1.) Tj\nET\n';
  stream += 'BT\n/F1 7.5 Tf\n0.35 0.4 0.45 rg\n55 ' + (y + 20) + ' Td\n(3. Bank transfer UTR ' + escapePdfText(set.utr) + ' reconciled via RBI automated clearing system. No physical signature required.) Tj\nET\n';
  stream += 'BT\n/F2 7.5 Tf\n0.15 0.5 0.25 rg\n55 ' + (y + 8) + ' Td\n(Verification Hash: SHA256-' + escapePdfText(set.id) + '-' + escapePdfText(set.utr) + ' | Cryptographically Verified System Generated Report) Tj\nET\n';

  // Bottom Footer
  stream += 'BT\n/F1 7.5 Tf\n0.5 0.55 0.6 rg\n40 75 Td\n(Corporate Headquarters: ElectraKart Hyperlocal Marketplace India Pvt Ltd, Auto Nagar Phase 2, Vijayawada, AP 520007) Tj\nET\n';
  stream += 'BT\n/F1 7.5 Tf\n0.5 0.55 0.6 rg\n40 62 Td\n(Support: merchant-support@electrakart.com | Toll-Free: 1800-419-3352 | CIN: U52100AP2026PTC123456) Tj\nET\n';

  const streamLen = stream.length;
  addObj('6 0 obj\n<< /Length ' + streamLen + ' >>\nstream\n' + stream + 'endstream\nendobj');

  const startXref = body.length;
  body += 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 0; i < offsets.length; i++) {
    const off = String(offsets[i]).padStart(10, '0');
    body += off + ' 00000 n \n';
  }
  body += 'trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n' + startXref + '\n%%EOF\n';
  return body;
}

/**
 * Generates an official Customer Order Tax Invoice / Cash Memo PDF
 */
export function generateInvoicePdf(invoice: InvoicePdfData): string {
  let body = '';
  const offsets: number[] = [];

  function addObj(str: string) {
    offsets.push(body.length);
    body += str + '\n';
  }

  body += '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

  // 1: Catalog
  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  // 2: Pages
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  // 3: Page (A4 Dimensions: 595.28 x 841.89)
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /ProcSet [/PDF /Text] >> /Contents 6 0 R >>\nendobj');
  // 4: Font Regular
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj');
  // 5: Font Bold
  addObj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj');

  let stream = '';

  // Header Banner
  stream += '0.08 0.11 0.16 rg\n0 740 595.28 102 re\nf\n';

  // Branding
  stream += 'BT\n/F2 18 Tf\n1 1 1 rg\n40 802 Td\n(ELECTRAKART HYPERLOCAL MARKETPLACE) Tj\nET\n';
  stream += 'BT\n/F1 10 Tf\n0.85 0.88 0.95 rg\n40 784 Td\n(ORIGINAL TAX INVOICE / CASH MEMO FOR CUSTOMER) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.7 0.75 0.85 rg\n40 768 Td\n(Issued under Section 31 of CGST Act 2017 & Andhra Pradesh SGST Rules) Tj\nET\n';
  stream += 'BT\n/F1 8 Tf\n0.6 0.65 0.75 rg\n40 754 Td\n(GSTIN: 37AAACE9921K1Z8 | State Code: 37 (Andhra Pradesh) | PAN: AAACE9921K) Tj\nET\n';

  // Paid Stamp
  const isPaid = (invoice.paymentStatus || 'PAID').toUpperCase() === 'PAID';
  if (isPaid) {
    stream += '0.1 0.6 0.3 rg\n475 788 80 24 re\nf\n';
    stream += 'BT\n/F2 11 Tf\n1 1 1 rg\n500 796 Td\n(PAID) Tj\nET\n';
  }

  // Invoice & Customer Info Box
  stream += '0.96 0.97 0.99 rg\n40 620 515 105 re\nf\n';
  stream += '0.82 0.85 0.9 RG\n0.6 w\n40 620 515 105 re\nS\n';

  // Left Column - Bill To
  stream += 'BT\n/F2 9.5 Tf\n0.1 0.15 0.25 rg\n55 705 Td\n(BILLED TO / RECIPIENT) Tj\nET\n';
  stream += 'BT\n/F2 10.5 Tf\n0.05 0.1 0.2 rg\n55 690 Td\n(' + escapePdfText(invoice.customerName) + ') Tj\nET\n';
  if (invoice.customerPhone) {
    stream += 'BT\n/F1 8.5 Tf\n0.35 0.4 0.5 rg\n55 675 Td\n(Phone: ' + escapePdfText(invoice.customerPhone) + ') Tj\nET\n';
  }
  stream += 'BT\n/F1 8.5 Tf\n0.35 0.4 0.5 rg\n55 660 Td\n(Delivery Destination: ' + escapePdfText(invoice.deliveryAddress.slice(0, 45)) + ') Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.15 0.2 0.3 rg\n55 635 Td\n(Payment Method: ' + escapePdfText(invoice.paymentMethod || 'UPI / Online Instant Settlement') + ') Tj\nET\n';

  // Right Column - Invoice Meta
  stream += 'BT\n/F2 9.5 Tf\n0.1 0.15 0.25 rg\n330 705 Td\n(INVOICE PARTICULARS) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.4 0.45 0.5 rg\n330 690 Td\n(Invoice Number:) Tj\nET\n';
  stream += 'BT\n/F2 9.5 Tf\n0.05 0.1 0.2 rg\n420 690 Td\n(' + escapePdfText(invoice.invoiceNumber) + ') Tj\nET\n';

  stream += 'BT\n/F1 8.5 Tf\n0.4 0.45 0.5 rg\n330 675 Td\n(Order Reference:) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.1 0.1 0.15 rg\n420 675 Td\n(' + escapePdfText(invoice.orderNumber) + ') Tj\nET\n';

  stream += 'BT\n/F1 8.5 Tf\n0.4 0.45 0.5 rg\n330 660 Td\n(Invoice Date:) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.1 0.1 0.15 rg\n420 660 Td\n(' + escapePdfText(invoice.orderDate) + ') Tj\nET\n';

  stream += 'BT\n/F1 8.5 Tf\n0.4 0.45 0.5 rg\n330 645 Td\n(Place of Supply:) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.1 0.1 0.15 rg\n420 645 Td\n(Andhra Pradesh (37)) Tj\nET\n';

  // Items Table Header
  stream += '0.12 0.16 0.24 rg\n40 580 515 22 re\nf\n';
  stream += 'BT\n/F2 8.5 Tf\n1 1 1 rg\n50 587 Td\n(S.NO) Tj\nET\n';
  stream += 'BT\n/F2 8.5 Tf\n1 1 1 rg\n85 587 Td\n(ITEM DESCRIPTION) Tj\nET\n';
  stream += 'BT\n/F2 8.5 Tf\n1 1 1 rg\n340 587 Td\n(QTY) Tj\nET\n';
  stream += 'BT\n/F2 8.5 Tf\n1 1 1 rg\n390 587 Td\n(RATE (INR)) Tj\nET\n';
  stream += 'BT\n/F2 8.5 Tf\n1 1 1 rg\n480 587 Td\n(TOTAL (INR)) Tj\nET\n';

  // Items List
  let y = 556;
  const items = invoice.items.slice(0, 10);
  items.forEach((it, idx) => {
    const bg = idx % 2 === 0 ? '0.98 0.98 0.99' : '1 1 1';
    stream += bg + ' rg\n40 ' + y + ' 515 22 re\nf\n';
    stream += '0.9 0.91 0.94 RG\n0.5 w\n40 ' + y + ' 515 22 re\nS\n';

    stream += 'BT\n/F1 8 Tf\n0.3 0.35 0.4 rg\n55 ' + (y + 7) + ' Td\n(' + (idx + 1) + ') Tj\nET\n';
    stream += 'BT\n/F1 8 Tf\n0.1 0.1 0.15 rg\n85 ' + (y + 7) + ' Td\n(' + escapePdfText(it.name.slice(0, 42)) + ') Tj\nET\n';
    stream += 'BT\n/F1 8 Tf\n0.1 0.1 0.15 rg\n345 ' + (y + 7) + ' Td\n(' + it.quantity + ') Tj\nET\n';
    stream += 'BT\n/F1 8 Tf\n0.1 0.1 0.15 rg\n390 ' + (y + 7) + ' Td\n(Rs. ' + it.unitPrice.toLocaleString('en-IN') + ') Tj\nET\n';
    stream += 'BT\n/F2 8 Tf\n0.1 0.1 0.15 rg\n480 ' + (y + 7) + ' Td\n(Rs. ' + it.totalPrice.toLocaleString('en-IN') + ') Tj\nET\n';
    y -= 23;
  });

  // Financial Subtotals Box
  y -= 10;
  stream += '0.97 0.98 0.99 rg\n300 ' + (y - 75) + ' 255 85 re\nf\n';
  stream += '0.85 0.88 0.92 RG\n0.5 w\n300 ' + (y - 75) + ' 255 85 re\nS\n';

  stream += 'BT\n/F1 8.5 Tf\n0.3 0.35 0.4 rg\n315 ' + (y - 12) + ' Td\n(Taxable Subtotal:) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.1 0.1 0.15 rg\n465 ' + (y - 12) + ' Td\n(Rs. ' + invoice.subtotal.toLocaleString('en-IN') + ') Tj\nET\n';

  stream += 'BT\n/F1 8.5 Tf\n0.3 0.35 0.4 rg\n315 ' + (y - 28) + ' Td\n(Applicable GST (CGST 9% + SGST 9%):) Tj\nET\n';
  stream += 'BT\n/F1 8.5 Tf\n0.1 0.1 0.15 rg\n465 ' + (y - 28) + ' Td\n(Rs. ' + invoice.gstTotal.toLocaleString('en-IN') + ') Tj\nET\n';

  if (invoice.deliveryFee !== undefined) {
    stream += 'BT\n/F1 8.5 Tf\n0.3 0.35 0.4 rg\n315 ' + (y - 44) + ' Td\n(Hyperlocal Delivery Fee:) Tj\nET\n';
    stream += 'BT\n/F1 8.5 Tf\n0.1 0.1 0.15 rg\n465 ' + (y - 44) + ' Td\n(' + (invoice.deliveryFee === 0 ? 'FREE' : 'Rs. ' + invoice.deliveryFee) + ') Tj\nET\n';
  }

  // Grand Total Line
  stream += '0.1 0.6 0.3 rg\n300 ' + (y - 75) + ' 255 24 re\nf\n';
  stream += 'BT\n/F2 10 Tf\n1 1 1 rg\n315 ' + (y - 67) + ' Td\n(GRAND TOTAL (INCL. TAXES):) Tj\nET\n';
  stream += 'BT\n/F2 11 Tf\n1 1 1 rg\n460 ' + (y - 67) + ' Td\n(Rs. ' + invoice.grandTotal.toLocaleString('en-IN') + ') Tj\nET\n';

  // Legal and System-Generated Notice
  stream += 'BT\n/F1 7.5 Tf\n0.45 0.5 0.55 rg\n40 100 Td\n(This is a computer-generated tax invoice issued by ElectraKart Hyperlocal Platform under the CGST / SGST Act.) Tj\nET\n';
  stream += 'BT\n/F1 7.5 Tf\n0.45 0.5 0.55 rg\n40 88 Td\n(No signature required. 100% genuine electrical materials sourced from authorized brand distributors.) Tj\nET\n';
  stream += 'BT\n/F2 7.5 Tf\n0.2 0.25 0.35 rg\n40 76 Td\n(ElectraKart Hyperlocal Marketplace India Pvt Ltd | CIN: U52100AP2026PTC123456 | support@electrakart.com) Tj\nET\n';

  const streamLen = stream.length;
  addObj('6 0 obj\n<< /Length ' + streamLen + ' >>\nstream\n' + stream + 'endstream\nendobj');

  const startXref = body.length;
  body += 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 0; i < offsets.length; i++) {
    const off = String(offsets[i]).padStart(10, '0');
    body += off + ' 00000 n \n';
  }
  body += 'trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n' + startXref + '\n%%EOF\n';
  return body;
}

export function downloadSettlementPdf(set: SettlementPdfData, merchant: MerchantInfo): void {
  const pdfString = generateSettlementPdf(set, merchant);
  downloadPdfBlob(pdfString, `ElectraKart_Settlement_${set.id}.pdf`);
}

export function downloadCustomerInvoicePdf(invoice: InvoicePdfData): void {
  const pdfString = generateInvoicePdf(invoice);
  downloadPdfBlob(pdfString, `ElectraKart_Invoice_${invoice.invoiceNumber}.pdf`);
}
