import React from 'react';
import { Link } from 'react-router-dom';
import {
  Warehouse,
  Boxes,
  Truck,
  ArrowRightLeft,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const DistributorDashboard: React.FC = () => {
  const { warehouses, orders } = useStore();

  const totalUnits = warehouses.reduce((acc, w) => acc + w.totalInventoryUnits, 0);
  const totalReserved = warehouses.reduce((acc, w) => acc + w.reservedStockUnits, 0);
  const totalIncoming = warehouses.reduce((acc, w) => acc + w.incomingStockUnits, 0);

  // Distributor fulfillments
  const distributorOrders = orders.filter((o) =>
    o.fulfillments.some((f) => f.partnerId === 'dist-abc-vja-hub')
  );

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Regional Logistics & Master Depot Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            ABC Electrical Distributors Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Overseeing 3 regional master warehouses: Vijayawada, Hyderabad, and Visakhapatnam
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/distributor/warehouses"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <span>Warehouse Stock Transfer</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Warehouses</span>
          <div className="text-2xl font-black text-slate-900 font-mono">{warehouses.length} Hubs</div>
          <span className="text-[10px] text-emerald-600 font-bold block">AP & Telangana Network</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Inventory Units</span>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalUnits.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 block">Across all 3 regional hubs</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Allocated to Retailers</span>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {totalReserved.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 block">Reserved for local shops</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inward Factory Shipments</span>
          <div className="text-2xl font-black text-blue-600 font-mono">
            {totalIncoming.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 block">Direct from Polycab/Havells</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2 col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">B2B Trade Dispatches</span>
          <div className="text-2xl font-black text-emerald-700 font-mono">{distributorOrders.length} Active</div>
          <span className="text-[10px] text-emerald-600 font-bold block">Today's bulk dispatch</span>
        </div>
      </div>

      {/* 3 Regional Warehouses Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">Regional Distribution Depots</h3>
          <Link
            to="/distributor/warehouses"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Manage Warehouses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 hover:border-indigo-400 transition-colors"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-indigo-600" />
                  <span className="font-extrabold text-xs text-slate-900">{wh.city} Hub</span>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full font-mono">
                  Operational
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-slate-900">{wh.warehouseName}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{wh.address}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">Area: {wh.capacitySqFt.toLocaleString()} sq.ft</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-mono">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Inventory</span>
                  <span className="font-bold text-slate-900">{wh.totalInventoryUnits.toLocaleString()}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Master SKUs</span>
                  <span className="font-bold text-slate-900">{wh.totalSkus}</span>
                </div>
              </div>

              <Link
                to="/distributor/warehouses"
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold text-center block transition-colors"
              >
                Inspect Bay Stock & Transfers
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
