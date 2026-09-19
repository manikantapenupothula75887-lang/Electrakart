import React, { useState } from 'react';
import { Boxes, Search, Plus, Filter, ArrowRight, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const DistributorInventoryPage: React.FC = () => {
  const { products } = useStore();
  const [search, setSearch] = useState('');

  const bulkStockRows = products.map((p, idx) => ({
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    series: p.series,
    palletCount: Math.floor(4 + (idx * 3) % 12),
    masterCartons: Math.floor(40 + (idx * 15) % 180),
    totalUnits: Math.floor(400 + (idx * 150) % 2000),
    unit: p.unit,
    bayLocation: `Bay ${String.fromCharCode(65 + (idx % 6))}-${10 + (idx % 20)}`,
  }));

  const filtered = bulkStockRows.filter(
    (it) =>
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.sku.toLowerCase().includes(search.toLowerCase()) ||
      it.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Bulk Master Pallet Storage
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Master Distributor Wholesale Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pallet-level tracking across Auto Nagar Central Depot
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Master SKU, brand, bay location..."
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Showing {filtered.length} master pallets
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider font-mono">
                <th className="py-3 px-4">Master SKU</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Brand</th>
                <th className="py-3 px-3 text-center">Bay Location</th>
                <th className="py-3 px-3 text-center">Pallets</th>
                <th className="py-3 px-3 text-center">Cartons</th>
                <th className="py-3 px-3 text-right">Total Units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.map((r) => (
                <tr key={r.sku} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{r.sku}</td>
                  <td className="py-3 px-3 font-sans font-semibold text-slate-800">{r.name}</td>
                  <td className="py-3 px-3 font-sans text-slate-600">{r.brand}</td>
                  <td className="py-3 px-3 text-center font-bold text-indigo-700 bg-indigo-50/50">
                    {r.bayLocation}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-700">{r.palletCount}</td>
                  <td className="py-3 px-3 text-center text-slate-700">{r.masterCartons}</td>
                  <td className="py-3 px-3 text-right font-black text-slate-950 text-sm">
                    {r.totalUnits.toLocaleString('en-IN')}
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
