import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Phone,
  Store,
  Warehouse,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus } from '../../types';

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { orders } = useStore();

  // Find target order or fallback to first
  const order = orders.find((o) => o.id === id || o.orderNumber === id) || orders[0];

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Package className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold">Order Not Found</h2>
        <Link to="/customer/orders" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
          View All Orders
        </Link>
      </div>
    );
  }

  const stages: { key: OrderStatus; label: string }[] = [
    { key: 'PLACED', label: 'Placed' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PARTNER_ACCEPTED', label: 'Accepted' },
    { key: 'PREPARING', label: 'Preparing' },
    { key: 'PACKED', label: 'Packed' },
    { key: 'DISPATCHED', label: 'Dispatched' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { key: 'DELIVERED', label: 'Delivered' },
  ];

  const getStageIndex = (status: OrderStatus) => {
    return stages.findIndex((s) => s.key === status);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <Link
            to="/customer/orders"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-bold mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Orders</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Order {order.orderNumber}
            </h1>
            <span className="text-xs bg-amber-500/20 text-amber-800 font-extrabold px-3 py-1 rounded-full border border-amber-500/30 uppercase">
              {order.overallStatus.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Placed on {order.createdAt} • Delivery to {order.customerName} ({order.city})
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 block font-mono">Total Paid</span>
          <span className="font-mono font-black text-xl text-slate-900">
            ₹{order.grandTotal.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-600 font-bold block">
            {order.paymentMethod} • {order.paymentStatus}
          </span>
        </div>
      </div>

      {/* Multi-Location Dispatch Notice */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-white">
              Unified Order Split into {order.fulfillments.length} Parallel Store Fulfillments
            </h4>
            <p className="text-[11px] text-slate-400">
              Stores are packing and dispatching their items concurrently for minimum transit time.
            </p>
          </div>
        </div>
      </div>

      {/* Split Fulfillments Progress Cards */}
      <div className="space-y-6">
        {order.fulfillments.map((ful) => {
          const activeIndex = getStageIndex(ful.status);

          return (
            <div
              key={ful.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6"
            >
              {/* Partner Store Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold shrink-0">
                    {ful.partnerType === 'DISTRIBUTOR' ? (
                      <Warehouse className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Store className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                        Fulfillment #{ful.fulfillmentIndex}
                      </span>
                      <span className="font-extrabold text-sm sm:text-base text-slate-900">
                        {ful.partnerName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{ful.partnerAddress}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block font-mono">
                    {ful.status.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-1">ETA: {ful.eta}</span>
                </div>
              </div>

              {/* Multi-Step Horizontal Progress Bar (Prompt Requirement) */}
              <div className="py-2">
                <div className="hidden md:flex items-center justify-between relative">
                  {/* Connecting Track */}
                  <div className="absolute left-4 right-4 top-4 h-1 bg-slate-200 -z-0">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${(activeIndex / (stages.length - 1)) * 100}%` }}
                    ></div>
                  </div>

                  {stages.map((stage, idx) => {
                    const isPassed = idx <= activeIndex;
                    const isCurrent = idx === activeIndex;

                    return (
                      <div key={stage.key} className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300/40 font-black scale-110'
                              : isPassed
                              ? 'bg-slate-900 text-amber-400'
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          }`}
                        >
                          {isPassed ? '✓' : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] mt-2 font-semibold text-center whitespace-nowrap ${
                            isCurrent
                              ? 'text-slate-950 font-bold'
                              : isPassed
                              ? 'text-slate-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Stepper View */}
                <div className="md:hidden flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                  <span className="text-xs font-bold text-slate-700">Current Step:</span>
                  <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md">
                    {stages[activeIndex]?.label || ful.status} (Step {activeIndex + 1} of 8)
                  </span>
                </div>
              </div>

              {/* Items Fulfilled & Driver Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                {/* Items in this fulfillment */}
                <div>
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Materials Included in this Package:
                  </h5>
                  <div className="space-y-2">
                    {ful.items.map((item) => (
                      <div
                        key={item.sku}
                        className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{item.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-800">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Driver / Handover OTP Details */}
                <div className="space-y-3">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Dispatch & Pilot Verification:
                  </h5>
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Assigned Logistics Partner:</span>
                      <span className="font-bold text-slate-900">{ful.driverName || 'Dunzo / Hyperlocal Express'}</span>
                    </div>

                    {ful.handoverOtp && (
                      <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                        <span className="text-slate-700 font-bold">Delivery Handover OTP:</span>
                        <span className="font-mono font-black text-sm bg-white px-3 py-1 rounded-lg border border-amber-300 text-amber-900 tracking-widest">
                          {ful.handoverOtp}
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-amber-800">
                      Share OTP with delivery pilot only upon physical inspection of holographic seals.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
