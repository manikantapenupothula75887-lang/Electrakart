import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Store,
  Warehouse,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Building2,
  MapPin,
  Layers,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AdminDashboard: React.FC = () => {
  const { partners, orders, products, mappingQueue, quotations } = useStore();

  const totalGMV = orders.reduce((sum, o) => sum + o.grandTotal, 0) + 1850000; // Platform cumulative
  const pendingPartners = partners.filter((p) => p.status === 'PENDING').length;
  const activeRetailers = partners.filter((p) => p.type === 'RETAILER' && p.status === 'VERIFIED').length;
  const activeDistributors = partners.filter((p) => p.type === 'DISTRIBUTOR' && p.status === 'VERIFIED').length;
  const pendingMappings = mappingQueue.filter((m) => m.status === 'NEEDS_ADMIN_REVIEW').length;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            Super Administrator Control Plane
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            ElectraKart Marketplace Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pan-India network metrics, KYC approvals, catalog mapping, and city fulfillment engines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/partners"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Users className="w-4 h-4" />
            <span>Verify Partners ({pendingPartners})</span>
          </Link>

          <Link
            to="/admin/products"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Catalog Review ({pendingMappings})</span>
          </Link>
        </div>
      </div>

      {/* 10 REQUIRED DASHBOARD KPI CARDS (Prompt Requirement) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 1. Total GMV */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total GMV</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            ₹{(totalGMV / 100000).toFixed(2)}L
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block">+18.4% this month</span>
        </div>

        {/* 2. Today's Orders */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's Orders</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{orders.length + 18}</div>
          <span className="text-[10px] text-emerald-600 font-bold block">100% Split Fulfilled</span>
        </div>

        {/* 3. Active Customers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Customers</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">3,420</div>
          <span className="text-[10px] text-slate-500 block">Homeowners & Electricians</span>
        </div>

        {/* 4. Active Retailers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Retailers</span>
          <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono">{activeRetailers}</div>
          <span className="text-[10px] text-slate-500 block">Verified Local Counters</span>
        </div>

        {/* 5. Active Distributors */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Distributors</span>
          <div className="text-xl sm:text-2xl font-black text-indigo-700 font-mono">{activeDistributors}</div>
          <span className="text-[10px] text-slate-500 block">Master Regional Depots</span>
        </div>

        {/* 6. Active Warehouses */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Warehouses</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">3</div>
          <span className="text-[10px] text-slate-500 block">Vijayawada, Hyd, Vskp</span>
        </div>

        {/* 7. Pending Verifications */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-rose-600 block">Pending KYC</span>
          <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono">{pendingPartners}</div>
          <span className="text-[10px] text-rose-600 font-bold block">Awaiting Admin Signoff</span>
        </div>

        {/* 8. Pending Quotations */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Quotations</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{quotations.length + 8}</div>
          <span className="text-[10px] text-amber-700 font-bold block">48-Hr Locked Rates</span>
        </div>

        {/* 9. Low Stock Alerts */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Low Stock Alerts</span>
          <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono">4</div>
          <span className="text-[10px] text-slate-500 block">Counter Threshold Warning</span>
        </div>

        {/* 10. Out of Stock */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Out of Stock SKUs</span>
          <div className="text-xl sm:text-2xl font-black text-slate-700 font-mono">1</div>
          <span className="text-[10px] text-slate-400 block">Depot transfer initiated</span>
        </div>
      </div>

      {/* CHARTS / VISUAL INTELLIGENCE (Prompt Requirement) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Sales Distribution */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Category Sales Breakdown</h3>
            <span className="text-[11px] text-slate-400 font-mono">Volume & GMV Contribution</span>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: 'Wires & Cables (Polycab, Finolex, RR Kabel)', percent: 42, color: 'bg-amber-500' },
              { label: 'Switches & Sockets (Anchor Roma, Legrand)', percent: 28, color: 'bg-indigo-600' },
              { label: 'Fans & Ventilation (Havells BLDC)', percent: 16, color: 'bg-blue-500' },
              { label: 'MCBs, Protection & DBs (Schneider Acti9)', percent: 14, color: 'bg-emerald-600' },
            ].map((cat) => (
              <div key={cat.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{cat.label}</span>
                  <span className="font-mono font-bold text-slate-900">{cat.percent}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* City Performance Comparison */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Hub City Performance</h3>
            <span className="text-[11px] text-slate-400 font-mono">30-Day Order Density</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { city: 'Vijayawada', gmv: '₹12.4L', orders: 480, growth: '+24%' },
              { city: 'Hyderabad', gmv: '₹18.9L', orders: 690, growth: '+31%' },
              { city: 'Visakhapatnam', gmv: '₹8.6L', orders: 310, growth: '+15%' },
              { city: 'Guntur', gmv: '₹5.2L', orders: 220, growth: '+19%' },
            ].map((c) => (
              <div key={c.city} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-xs text-slate-800 block">{c.city}</span>
                <span className="font-mono font-extrabold text-sm text-slate-900 block">{c.gmv}</span>
                <span className="text-[10px] text-emerald-600 font-bold block">{c.growth} growth</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
