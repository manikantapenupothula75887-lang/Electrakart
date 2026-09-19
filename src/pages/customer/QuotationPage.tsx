import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Download,
  Share2,
  Phone,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  Printer,
  ShoppingBag,
  FileCheck,
  Zap,
  Edit3,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ElectraKartLogo } from '../../components/common/ElectraKartLogo';

export const QuotationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { quotations, acceptQuotation, currentCity, pincode } = useStore();
  const navigate = useNavigate();

  const [shareToast, setShareToast] = useState(false);
  const [acceptedToast, setAcceptedToast] = useState(false);

  // Find quotation or fallback to first
  const quotation = quotations.find((q) => q.id === id) || quotations[0];

  if (!quotation) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <FileCheck className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Quotation Not Found</h2>
        <p className="text-xs text-slate-500">Please generate a quotation from the estimate page.</p>
        <Link to="/customer/estimate" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
          Go to Estimate
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = `ElectraKart Official Quotation ${quotation.quotationNumber} for ₹${quotation.grandTotal.toLocaleString('en-IN')}. Price locked for 48 hours. View online at: ${window.location.href}`;
    navigator.clipboard?.writeText(text);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 3000);
  };

  const handleAccept = () => {
    acceptQuotation(quotation.id);
    setAcceptedToast(true);
    setTimeout(() => {
      setAcceptedToast(false);
    }, 2500);
  };

  const handleOrderNow = () => {
    acceptQuotation(quotation.id);
    navigate('/customer/checkout');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Toast Alert */}
      {(shareToast || acceptedToast) && (
        <div className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {shareToast
              ? 'Quotation link copied! Ready to share on WhatsApp.'
              : 'Quotation Accepted! Materials synced to cart with locked prices.'}
          </span>
        </div>
      )}

      {/* Action Header Strip (Hidden during print) */}
      <div className="no-print bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm">{quotation.quotationNumber}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                {quotation.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Price locked until {quotation.validUntil}</p>
          </div>
        </div>

        {/* Buttons as per spec */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            title="Print or Save PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp / Share</span>
          </button>

          <button
            onClick={handleAccept}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accept Quote</span>
          </button>

          <button
            onClick={handleOrderNow}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm transition-all hover:scale-102"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Order Now</span>
          </button>
        </div>
      </div>

      {/* FORMAL PRINTABLE QUOTATION SHEET */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Quotation Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <ElectraKartLogo size="lg" />
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              ElectraKart Technologies Private Limited<br />
              Central Logistics Zone, Auto Nagar, Vijayawada - 520007<br />
              GSTIN: <strong>37AACCE8912P1ZV</strong> • CIN: U31900AP2026PTC081294
            </p>
          </div>

          <div className="text-right space-y-1 self-start sm:self-auto">
            <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded-md text-xs font-mono font-extrabold">
              OFFICIAL TRADE QUOTATION
            </div>
            <div className="text-xs font-mono text-slate-700">
              <div>Quote #: <strong>{quotation.quotationNumber}</strong></div>
              <div>Date: {quotation.createdAt}</div>
              <div className="text-emerald-700 font-bold flex items-center gap-1 justify-end mt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Price Locked: 48 Hours Guarantee</span>
              </div>
              <div className="text-[10px] text-slate-400">Valid until: {quotation.validUntil}</div>
            </div>
          </div>
        </div>

        {/* Customer & Delivery Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Customer Details</span>
            <div className="font-extrabold text-slate-900 text-sm">{quotation.customerName}</div>
            <div className="text-slate-600 font-mono mt-0.5">{quotation.customerPhone}</div>
            <div className="text-slate-500 mt-1">Account Type: Verified Contractor / Retail Client</div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Delivery Destination</span>
            <div className="text-slate-800 leading-relaxed font-medium">
              {quotation.deliveryAddress}
            </div>
            <div className="text-slate-600 font-bold mt-1">
              Fulfillment Hub: {quotation.city} ({quotation.pincode})
            </div>
          </div>
        </div>

        {/* Itemized Quotation Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3">Brand & Series</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                <th className="py-2.5 px-2 text-center">GST</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotation.items.map((item, i) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-2 font-mono text-slate-400">{i + 1}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    <div>{item.name}</div>
                    <span className="font-mono text-[10px] text-slate-400 block">SKU: {item.sku}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {item.brand} ({item.series})
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-bold text-slate-900">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    ₹{item.rate.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-2 text-center text-slate-500 font-mono">
                    {item.gstPercent}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900">
                    ₹{item.totalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Ledger & Totals */}
        <div className="border-t-2 border-slate-900 pt-4 flex flex-col sm:flex-row justify-between gap-6 text-xs">
          <div className="max-w-sm space-y-2 text-slate-500 text-[11px]">
            <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
              Terms & Locked Price Policy
            </h4>
            <p>
              1. Rates quoted are strictly locked for 48 hours from issuance under ElectraKart Price-Lock Guarantee.
            </p>
            <p>
              2. Fulfillments dispatched via authorized local stores in Vijayawada with genuine manufacturer warranties.
            </p>
            <p>
              3. Returns and box damage claims accepted within 7 days of delivery with seal intact.
            </p>
          </div>

          <div className="w-full sm:w-72 space-y-2 font-mono">
            <div className="flex justify-between py-1 text-slate-600">
              <span>Subtotal:</span>
              <span>₹{quotation.subtotal.toLocaleString('en-IN')}</span>
            </div>

            {quotation.discount > 0 && (
              <div className="flex justify-between py-1 text-emerald-700 font-bold">
                <span>Contractor Discount:</span>
                <span>-₹{quotation.discount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between py-1 text-slate-600">
              <span>Applicable GST (18%):</span>
              <span>₹{quotation.gstTotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between py-1 text-slate-600">
              <span>Delivery & Handling:</span>
              <span className="text-emerald-600 font-bold">FREE (Promotional)</span>
            </div>

            <div className="flex justify-between py-2 border-t-2 border-slate-900 text-base font-black text-slate-950 font-mono">
              <span>Grand Total:</span>
              <span>₹{quotation.grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Authorized Signatory Watermark */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Digitally verified via ElectraAI Pricing Engine (ID: {quotation.id})</span>
          </div>
          <div className="font-mono">Authorized ElectraKart Dispatch Gateway</div>
        </div>
      </div>
    </div>
  );
};
