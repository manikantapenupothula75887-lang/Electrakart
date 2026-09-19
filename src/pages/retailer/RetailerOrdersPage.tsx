import React, { useState } from 'react';
import {
  ShoppingCart,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus } from '../../types';

export const RetailerOrdersPage: React.FC = () => {
  const { orders, updateFulfillmentStatus } = useStore();
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Filter fulfillments for Vijayawada Electricals
  const allStoreFulfillments = orders.flatMap((order) => {
    const f = order.fulfillments.find((it) => it.partnerId === 'partner-vja-elec-1');
    return f ? [{ order, fulfillment: f }] : [];
  });

  const tabs: { key: string; label: string; count: number }[] = [
    { key: 'ALL', label: 'All Orders', count: allStoreFulfillments.length },
    {
      key: 'NEW',
      label: 'New Orders',
      count: allStoreFulfillments.filter((it) => it.fulfillment.status === 'CONFIRMED' || it.fulfillment.status === 'PLACED').length,
    },
    {
      key: 'ACCEPTED',
      label: 'Accepted',
      count: allStoreFulfillments.filter((it) => it.fulfillment.status === 'PARTNER_ACCEPTED').length,
    },
    {
      key: 'PREPARING',
      label: 'Preparing',
      count: allStoreFulfillments.filter((it) => it.fulfillment.status === 'PREPARING').length,
    },
    {
      key: 'READY',
      label: 'Ready / Packed',
      count: allStoreFulfillments.filter((it) => it.fulfillment.status === 'PACKED').length,
    },
    {
      key: 'PICKED_UP',
      label: 'Out for Delivery',
      count: allStoreFulfillments.filter((it) => it.fulfillment.status === 'OUT_FOR_DELIVERY').length,
    },
    {
      key: 'COMPLETED',
      label: 'Completed',
      count: allStoreFulfillments.filter((it) => it.fulfillment.status === 'DELIVERED').length,
    },
  ];

  const filtered = allStoreFulfillments.filter(({ order, fulfillment }) => {
    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'NEW' && (fulfillment.status === 'CONFIRMED' || fulfillment.status === 'PLACED')) ||
      (activeTab === 'ACCEPTED' && fulfillment.status === 'PARTNER_ACCEPTED') ||
      (activeTab === 'PREPARING' && fulfillment.status === 'PREPARING') ||
      (activeTab === 'READY' && fulfillment.status === 'PACKED') ||
      (activeTab === 'PICKED_UP' && fulfillment.status === 'OUT_FOR_DELIVERY') ||
      (activeTab === 'COMPLETED' && fulfillment.status === 'DELIVERED');

    const matchesSearch =
      !searchQuery.trim() ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const handleStatusUpdate = (
    orderId: string,
    fulfillmentId: string,
    newStatus: OrderStatus,
    msg: string
  ) => {
    updateFulfillmentStatus(orderId, fulfillmentId, newStatus, msg);
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(null), 3000);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Toast Alert */}
      {actionSuccessToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Fulfillment Queue
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Store Dispatch & Orders
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Accept incoming orders, assign packers, print shipping labels, and handover to delivery drivers
          </p>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-slate-900 text-amber-400 shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === tab.key ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-sm text-slate-800">No orders found in this status</h3>
            <p className="text-xs text-slate-500">Switch tabs or clear search filters to view other orders.</p>
          </div>
        ) : (
          filtered.map(({ order, fulfillment }) => (
            <div
              key={fulfillment.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-base text-slate-900">
                    {order.orderNumber}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                    Fulfillment #{fulfillment.fulfillmentIndex}
                  </span>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-mono uppercase">
                    {fulfillment.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Placed: {order.createdAt} • ETA: {fulfillment.eta}
                </div>
              </div>

              {/* Order Content */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                {/* Customer Details */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                  <div className="font-bold text-slate-900">{order.customerName}</div>
                  <div className="text-slate-600 font-mono">{order.customerPhone}</div>
                  <div className="text-slate-500 line-clamp-2">{order.deliveryAddress}</div>
                </div>

                {/* Items to Pack */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Materials to Pick & Pack
                  </span>
                  <div className="space-y-1.5">
                    {fulfillment.items.map((it) => (
                      <div key={it.sku} className="flex justify-between font-mono bg-slate-50 p-2 rounded-lg">
                        <span className="font-sans font-bold text-slate-900">{it.name}</span>
                        <span className="font-extrabold text-slate-800 ml-2">
                          {it.quantity} {it.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Logistics & Driver Handover */}
                <div className="space-y-2 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-900 block">
                      Driver & OTP Verification
                    </span>
                    <div className="font-bold text-slate-900 mt-1">
                      {fulfillment.driverName || 'Dunzo / Hyperlocal Express Pilot'}
                    </div>
                    {fulfillment.handoverOtp && (
                      <div className="text-xs text-amber-900 font-mono mt-1">
                        Handover OTP: <strong className="bg-white px-2 py-0.5 rounded border border-amber-300">{fulfillment.handoverOtp}</strong>
                      </div>
                    )}
                  </div>

                  {/* ACTION WORKFLOW BUTTONS (Prompt Requirement) */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200">
                    {(fulfillment.status === 'CONFIRMED' || fulfillment.status === 'PLACED') && (
                      <>
                        <button
                          onClick={() =>
                            handleStatusUpdate(
                              order.id,
                              fulfillment.id,
                              'PARTNER_ACCEPTED',
                              `Order ${order.orderNumber} accepted by counter.`
                            )
                          }
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
                        >
                          Accept Order
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(
                              order.id,
                              fulfillment.id,
                              'CANCELLED',
                              `Order ${order.orderNumber} rejected (out of stock).`
                            )
                          }
                          className="py-2 px-3 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {fulfillment.status === 'PARTNER_ACCEPTED' && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(
                            order.id,
                            fulfillment.id,
                            'PREPARING',
                            `Order ${order.orderNumber} marked as Preparing in warehouse.`
                          )
                        }
                        className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-extrabold text-xs shadow-sm"
                      >
                        Mark Preparing
                      </button>
                    )}

                    {fulfillment.status === 'PREPARING' && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(
                            order.id,
                            fulfillment.id,
                            'PACKED',
                            `Order ${order.orderNumber} packed and ready for pickup.`
                          )
                        }
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-sm"
                      >
                        Mark Ready (Packed)
                      </button>
                    )}

                    {fulfillment.status === 'PACKED' && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(
                            order.id,
                            fulfillment.id,
                            'OUT_FOR_DELIVERY',
                            `Package handed over to driver with OTP ${fulfillment.handoverOtp}.`
                          )
                        }
                        className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl font-bold text-xs shadow-sm"
                      >
                        Handover to Delivery Pilot
                      </button>
                    )}

                    {fulfillment.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(
                            order.id,
                            fulfillment.id,
                            'DELIVERED',
                            `Delivery confirmed by customer.`
                          )
                        }
                        className="w-full py-2 px-4 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-sm"
                      >
                        Mark Delivered
                      </button>
                    )}

                    {fulfillment.status === 'DELIVERED' && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Delivered & Settled
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
