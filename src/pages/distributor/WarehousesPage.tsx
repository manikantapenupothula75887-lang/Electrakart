import React, { useState } from 'react';
import {
  Warehouse,
  ArrowRightLeft,
  Boxes,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  UploadCloud,
  Sliders,
  Layers,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const WarehousesPage: React.FC = () => {
  const { warehouses, transferWarehouseStock } = useStore();
  const [selectedWhId, setSelectedWhId] = useState(warehouses[0]?.id || '');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferToast, setTransferToast] = useState<string | null>(null);

  // Transfer form state
  const [fromWh, setFromWh] = useState('wh-hyd-sanathnagar');
  const [toWh, setToWh] = useState('wh-vja-autonagar');
  const [transferSku, setTransferSku] = useState('Polycab FlameX FR 2.5 sq.mm Red');
  const [transferQty, setTransferQty] = useState(250);

  const activeWarehouse = warehouses.find((w) => w.id === selectedWhId) || warehouses[0];

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    transferWarehouseStock(fromWh, toWh, transferSku, transferQty);
    setShowTransferModal(false);

    const fromName = warehouses.find((w) => w.id === fromWh)?.city;
    const toName = warehouses.find((w) => w.id === toWh)?.city;
    setTransferToast(`Dispatched ${transferQty} units of ${transferSku} from ${fromName} Depot to ${toName} Hub.`);
    setTimeout(() => setTransferToast(null), 3500);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Toast Alert */}
      {transferToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-500/40 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{transferToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Multi-Depot Operations
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Regional Warehouses & Logistics Bays
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time stock balancing, inter-depot transfers, and bulk factory inwarding
          </p>
        </div>

        {/* Action Buttons as per spec */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Inter-Warehouse Transfer</span>
          </button>
        </div>
      </div>

      {/* Depot Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {warehouses.map((wh) => (
          <button
            key={wh.id}
            onClick={() => setSelectedWhId(wh.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedWhId === wh.id
                ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>{wh.warehouseName}</span>
          </button>
        ))}
      </div>

      {/* Selected Warehouse Detailed Metrics (Prompt Requirement) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase">
              Hub ID: {activeWarehouse.id} • {activeWarehouse.city}
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">{activeWarehouse.warehouseName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{activeWarehouse.address}</p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Capacity</span>
            <span className="text-sm font-bold font-mono text-slate-900">
              {activeWarehouse.capacitySqFt.toLocaleString()} sq.ft (72% utilized)
            </span>
          </div>
        </div>

        {/* 6 Required Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total SKUs */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total SKUs</span>
            <div className="text-xl font-black text-slate-900 font-mono">{activeWarehouse.totalSkus}</div>
            <span className="text-[10px] text-slate-400">In Master Catalog</span>
          </div>

          {/* Total Inventory */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Inventory</span>
            <div className="text-xl font-black text-indigo-700 font-mono">
              {activeWarehouse.totalInventoryUnits.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">Units in bay</span>
          </div>

          {/* Low Stock */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">Low Stock SKUs</span>
            <div className="text-xl font-black text-amber-700 font-mono">{activeWarehouse.lowStockCount}</div>
            <span className="text-[10px] text-amber-800">Below threshold</span>
          </div>

          {/* Out of Stock */}
          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-800 block">Out of Stock</span>
            <div className="text-xl font-black text-rose-700 font-mono">{activeWarehouse.outOfStockCount}</div>
            <span className="text-[10px] text-rose-800">Need PO request</span>
          </div>

          {/* Reserved Stock */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Reserved Stock</span>
            <div className="text-xl font-black text-slate-900 font-mono">
              {activeWarehouse.reservedStockUnits.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">Retailer allocations</span>
          </div>

          {/* Incoming Stock */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Incoming Stock</span>
            <div className="text-xl font-black text-emerald-700 font-mono">
              {activeWarehouse.incomingStockUnits.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-800">Inbound transit</span>
          </div>
        </div>
      </div>

      {/* STOCK TRANSFER MODAL (Prompt Requirement) */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900">Inter-Warehouse Stock Transfer</h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Source Depot (From)</label>
                  <select
                    value={fromWh}
                    onChange={(e) => setFromWh(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-medium"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.city} ({w.warehouseName.split('(')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Destination Hub (To)</label>
                  <select
                    value={toWh}
                    onChange={(e) => setToWh(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-medium"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.city} ({w.warehouseName.split('(')[0]})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Material SKU</label>
                <select
                  value={transferSku}
                  onChange={(e) => setTransferSku(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-medium"
                >
                  <option>Polycab FlameX FR 2.5 sq.mm Red (90m)</option>
                  <option>Finolex FRLSH 1.5 sq.mm Blue (90m)</option>
                  <option>Anchor Roma Classic 6-Module Plate</option>
                  <option>Havells Stealth Air 1200mm Ceiling Fan</option>
                  <option>Schneider Acti9 16A SP MCB</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Transfer Quantity (Units/Coils)</label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold"
                />
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-[11px]">
                An internal e-Way bill consignment manifest will be generated for interstate or intercity road transit.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold shadow-sm"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
