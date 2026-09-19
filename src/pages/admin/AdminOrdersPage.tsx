import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Truck, MapPin, CheckCircle2, ChevronRight, Search, Clock } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AdminOrdersPage: React.FC = () => {
  const { orders } = useStore();
  const [search, setSearch] = useState('');

  const filtered = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            Nationwide Logistics Oversight
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            All Platform Orders & Consignments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervise multi-store split fulfills and delivery pilot handovers across all active hubs
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-base text-slate-900">
                  {order.orderNumber}
                </span>
                <span className="font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-mono uppercase">
                  {order.overallStatus.replace('_', ' ')}
                </span>
                <span className="text-slate-500 font-mono">Hub: {order.city}</span>
              </div>
              <div className="font-mono font-black text-slate-900 text-sm">
                Total: ₹{order.grandTotal.toLocaleString('en-IN')} (Paid via {order.paymentMethod})
              </div>
            </div>

            {/* Fulfillments breakdown */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Split Fulfillments ({order.fulfillments.length} Stores):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {order.fulfillments.map((f) => (
                  <div key={f.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 font-mono">Fulfillment #{f.fulfillmentIndex}</span>
                      <span className="text-emerald-700 font-mono text-[10px] uppercase">
                        {f.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold">{f.partnerName}</p>
                    <p className="text-[10px] text-slate-500">
                      {f.items.map((i) => `${i.quantity}x ${i.name.split(' ')[0]}`).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
