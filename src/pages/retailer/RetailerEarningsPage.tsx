import React from 'react';
import { IndianRupee, Download, CheckCircle2, TrendingUp, Calendar, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const RetailerEarningsPage: React.FC = () => {
  const { currentCity } = useStore();

  const settlements = [
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

  return (
    <div className="space-y-8 pb-8">
      <div>
        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
          Merchant Accounts • Vijayawada Electricals
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
          Earnings & Bank Settlements
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Weekly automated bank transfers directly to State Bank of India (A/C: ****9104)
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
          <div className="text-3xl font-black text-slate-800 font-mono">5.50%</div>
          <span className="text-[11px] text-slate-500">Tier-1 Verified Retailer Rate</span>
        </div>
      </div>

      {/* Settlement History Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
          Weekly Settlement Statements
        </h3>

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
                <tr key={set.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-bold text-slate-900">{set.id}</td>
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
                    <button
                      onClick={() => alert(`Downloading GST Credit Note for ${set.id}`)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
