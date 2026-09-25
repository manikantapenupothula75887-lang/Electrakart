import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  IndianRupee,
  Download,
  CheckCircle2,
  TrendingUp,
  Calendar,
  ShieldCheck,
  FileText,
  Printer,
  X,
  Building2,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  downloadSettlementPdf,
  SettlementPdfData,
  MerchantInfo,
} from '../../utils/pdfGenerator';

export const RetailerEarningsPage: React.FC = () => {
  const { currentCity, userRole } = useStore();
  const location = useLocation();

  const isDistributor = location.pathname.startsWith('/distributor') || userRole === 'DISTRIBUTOR';

  const merchantInfo: MerchantInfo = isDistributor
    ? {
        name: 'ABC Electrical Distributors Central Hub',
        role: 'Master Distributor',
        bankAccount: 'State Bank of India (A/C: ****9104)',
        gstin: '37AABCA5678M1Z2',
        address: 'Auto Nagar Phase 2, Vijayawada, AP - 520007',
        commissionRate: '5.50%',
      }
    : {
        name: 'Vijayawada Electricals',
        role: 'Tier-1 Verified Retailer',
        bankAccount: 'HDFC Bank (A/C: ****4492)',
        gstin: '37AAACE1234F1Z5',
        address: 'Governorpet Main Road, Vijayawada, AP - 520002',
        commissionRate: '5.50%',
      };

  const settlements: SettlementPdfData[] = [
    {
      id: 'SET-2026-W38',
      period: '12 Sep 2026 – 18 Sep 2026',
      grossSales: 184500,
      commission: 10147, // 5.5%
      tds: 1845, // 1%
      netPayout: 172508,
      status: 'SETTLED',
      utr: 'UTR984810294812',
      payoutDate: '19 Sep 2026',
    },
    {
      id: 'SET-2026-W37',
      period: '05 Sep 2026 – 11 Sep 2026',
      grossSales: 215000,
      commission: 11825,
      tds: 2150,
      netPayout: 201025,
      status: 'SETTLED',
      utr: 'UTR883910283912',
      payoutDate: '12 Sep 2026',
    },
  ];

  const [activeModalSettlement, setActiveModalSettlement] = useState<SettlementPdfData | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  const handleDownload = (set: SettlementPdfData) => {
    downloadSettlementPdf(set, merchantInfo);
    setDownloadSuccessToast(`Tax statement PDF (${set.id}.pdf) downloaded successfully!`);
    setTimeout(() => {
      setDownloadSuccessToast(null);
    }, 4000);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Toast Notification */}
      {downloadSuccessToast && (
        <div className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{downloadSuccessToast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          Merchant Accounts • {merchantInfo.name}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
          Earnings & Bank Settlements
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Weekly automated bank transfers directly to {merchantInfo.bankAccount}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Settled (Sep 2026)
          </span>
          <div className="text-3xl font-black text-slate-900 font-mono">₹3,73,533</div>
          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Payout Disbursed
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Current Week Accrual (Pending)
          </span>
          <div className="text-3xl font-black text-amber-600 font-mono">₹45,169</div>
          <span className="text-[11px] text-slate-500">Scheduled for Thursday Transfer</span>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Platform Take-Rate
          </span>
          <div className="text-3xl font-black text-slate-800 font-mono">{merchantInfo.commissionRate}</div>
          <span className="text-[11px] text-slate-500">{merchantInfo.role} Rate</span>
        </div>
      </div>

      {/* Settlement History Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Weekly Settlement Statements
          </h3>
          <span className="text-xs text-slate-400 font-mono">GST & Section 194-O Compliant</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Settlement ID</th>
                <th className="py-3 px-3">Billing Cycle</th>
                <th className="py-3 px-3 text-right">Gross Sales (₹)</th>
                <th className="py-3 px-3 text-right">Commission (5.5%)</th>
                <th className="py-3 px-3 text-right">Net Payout (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Tax Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {settlements.map((set) => (
                <tr key={set.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900">
                    <button
                      onClick={() => setActiveModalSettlement(set)}
                      className="text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1"
                      title="View Settlement Details"
                    >
                      {set.id}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-600">{set.period}</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    ₹{set.grossSales.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-600">
                    -₹{set.commission.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-800 text-sm">
                    ₹{set.netPayout.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-center font-sans">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                      {set.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-sans">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownload(set)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold transition-all hover:scale-102"
                        title={`Download official PDF for ${set.id}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Settlement Statement / GST Credit Note Modal */}
      {activeModalSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  Official GST Tax Settlement Statement
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Settlement {activeModalSettlement.id}
                </h3>
                <p className="text-xs text-slate-400">
                  Billing Cycle: {activeModalSettlement.period} • Bank Transfer UTR: {activeModalSettlement.utr}
                </p>
              </div>
              <button
                onClick={() => setActiveModalSettlement(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Merchant & Bank Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Merchant Entity</span>
                <div className="font-bold text-slate-900">{merchantInfo.name}</div>
                <div className="text-slate-500 text-[11px]">GSTIN: {merchantInfo.gstin}</div>
                <div className="text-slate-500 text-[11px]">{merchantInfo.address}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Bank Remittance</span>
                <div className="font-bold text-slate-900">{merchantInfo.bankAccount}</div>
                <div className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed on {activeModalSettlement.payoutDate}
                </div>
                <div className="text-slate-500 text-[11px]">NEFT Reference: {activeModalSettlement.utr}</div>
              </div>
            </div>

            {/* Financial Ledger Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Financial Accounting Breakdown
              </h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                <div className="flex justify-between p-3 bg-slate-50/50">
                  <span className="text-slate-600 font-medium">Gross Merchandise Value (GMV)</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{activeModalSettlement.grossSales.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-600 font-medium">
                    Less: Platform Facilitation Fee ({merchantInfo.commissionRate})
                  </span>
                  <span className="font-mono font-bold text-rose-600">
                    -₹{activeModalSettlement.commission.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-600 font-medium">
                    Less: Tax Deducted at Source (TDS Section 194-O @ 1%)
                  </span>
                  <span className="font-mono font-bold text-rose-600">
                    -₹{activeModalSettlement.tds.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between p-3.5 bg-emerald-50 text-emerald-950 font-bold">
                  <span className="text-emerald-900">Net Bank Payout Disbursed</span>
                  <span className="font-mono text-base text-emerald-800">
                    ₹{activeModalSettlement.netPayout.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Statutory Compliance Note */}
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                GST Input Tax Credit & Statutory Statement
              </div>
              <p>
                This document serves as an official GST Credit Note issued under Rule 54 of CGST Rules, 2017. Platform GSTIN: 37AAACE9921K1Z8. Computer-generated without manual signature.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModalSettlement(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload(activeModalSettlement)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:scale-102"
              >
                <Download className="w-4 h-4" />
                <span>Download Official PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
