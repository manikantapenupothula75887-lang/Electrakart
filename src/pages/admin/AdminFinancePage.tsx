import React from 'react';
import { TrendingUp, IndianRupee, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AdminFinancePage: React.FC = () => {
  const { orders } = useStore();

  const totalGMV = orders.reduce((sum, o) => sum + o.grandTotal, 0) + 1850000;
  const platformMargin = Math.round(totalGMV * 0.055); // 5.5% blended commission
  const gstCollected = Math.round(totalGMV * 0.18);

  return (
    <div className="space-y-8 pb-8">
      <div>
        <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
          Treasury & Margin Analytics
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
          Financial Settlements & Platform Commission
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Master fee reconciliation, GST input tax credits, and partner payout distributions
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Merchandise Value (GMV)</span>
          <div className="text-3xl font-black text-slate-900 font-mono">
            ₹{(totalGMV / 100000).toFixed(2)} Lakhs
          </div>
          <span className="text-[11px] text-emerald-600 font-bold block">+28% YoY expansion</span>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Take-Rate Earned</span>
          <div className="text-3xl font-black text-emerald-700 font-mono">
            ₹{(platformMargin / 100000).toFixed(2)} Lakhs
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Avg blended rate: 5.5%</span>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">GST Ledger (18%)</span>
          <div className="text-3xl font-black text-slate-800 font-mono">
            ₹{(gstCollected / 100000).toFixed(2)} Lakhs
          </div>
          <span className="text-[11px] text-slate-500">Government Input Credit Remitted</span>
        </div>
      </div>
    </div>
  );
};
