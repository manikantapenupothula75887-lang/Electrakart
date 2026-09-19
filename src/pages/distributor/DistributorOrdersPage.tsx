import React, { useState } from 'react';
import { Truck, CheckCircle2, Package, Clock, MapPin, Building2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus } from '../../types';

export const DistributorOrdersPage: React.FC = () => {
  const { orders, updateFulfillmentStatus } = useStore();
  const [toast, setToast] = useState<string | null>(null);

  // Find fulfillments routed to ABC Distributors
  const distributorFulfillments = orders.flatMap((order) => {
    const f = order.fulfillments.find((it) => it.partnerId === 'dist-abc-vja-hub');
    return f ? [{ order, fulfillment: f }] : [];
  });

  const handleUpdate = (orderId: string, fulfillmentId: string, status: OrderStatus, msg: string) => {
    updateFulfillmentStatus(orderId, fulfillmentId, status, msg);
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-8 pb-8">
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-500/40 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Consignment Logistics
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Distributor Fulfillment & Dispatch Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bulk orders routed from Auto Nagar Logistics Hub
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {distributorFulfillments.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-2">
            <Truck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-sm text-slate-800">No active distributor consignments</h3>
          </div>
        ) : (
          distributorFulfillments.map(({ order, fulfillment }) => (
            <div
              key={fulfillment.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-base text-slate-900">
                    {order.orderNumber}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-900 text-indigo-200 uppercase">
                    Distributor Consignment
                  </span>
                  <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full font-mono uppercase">
                    {fulfillment.status.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-mono">Slot: {fulfillment.eta}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Delivery Address
                  </span>
                  <span className="font-bold text-slate-900 block">{order.customerName}</span>
                  <span className="text-slate-600 font-mono">{order.customerPhone}</span>
                  <span className="text-slate-500 block mt-0.5">{order.deliveryAddress}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Consignment Items
                  </span>
                  <div className="space-y-1">
                    {fulfillment.items.map((it) => (
                      <div key={it.sku} className="font-mono bg-slate-50 p-2 rounded-lg flex justify-between">
                        <span className="font-sans font-bold text-slate-900">{it.name}</span>
                        <span className="font-bold text-slate-800">
                          {it.quantity} {it.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200/80 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-900 block">
                      Dispatch Manifest
                    </span>
                    <span className="font-bold text-slate-900 block mt-1">
                      {fulfillment.driverName || 'Regional Dispatch Van (AP16-TE-8102)'}
                    </span>
                    {fulfillment.handoverOtp && (
                      <span className="text-xs font-mono font-bold text-indigo-900 block mt-1">
                        Handover OTP: {fulfillment.handoverOtp}
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-indigo-200">
                    {fulfillment.status === 'PARTNER_ACCEPTED' && (
                      <button
                        onClick={() =>
                          handleUpdate(
                            order.id,
                            fulfillment.id,
                            'PACKED',
                            `Pallet loaded onto bay dispatch truck for ${order.orderNumber}.`
                          )
                        }
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-sm"
                      >
                        Mark Pallet Loaded & Dispatched
                      </button>
                    )}

                    {fulfillment.status === 'PACKED' && (
                      <button
                        onClick={() =>
                          handleUpdate(
                            order.id,
                            fulfillment.id,
                            'OUT_FOR_DELIVERY',
                            `Truck left Auto Nagar Bay for ${order.orderNumber}.`
                          )
                        }
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl font-bold text-xs shadow-sm"
                      >
                        Truck In Transit (Out for Delivery)
                      </button>
                    )}

                    {fulfillment.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() =>
                          handleUpdate(
                            order.id,
                            fulfillment.id,
                            'DELIVERED',
                            `Consignment delivered to site for ${order.orderNumber}.`
                          )
                        }
                        className="w-full py-2 bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm"
                      >
                        Confirm Consignment Delivery
                      </button>
                    )}

                    {fulfillment.status === 'DELIVERED' && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Consignment Delivered
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
