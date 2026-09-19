import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Clock,
  Package,
  AlertTriangle,
  IndianRupee,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Store,
  UploadCloud,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const RetailerDashboard: React.FC = () => {
  const { orders, retailerInventory, updateFulfillmentStatus, currentCity } = useStore();

  // Filter fulfillments for Vijayawada Electricals
  const myStoreOrders = orders.filter((o) =>
    o.fulfillments.some((f) => f.partnerId === 'partner-vja-elec-1')
  );

  const pendingFulfillments = myStoreOrders
    .map((o) => ({
      order: o,
      fulfillment: o.fulfillments.find((f) => f.partnerId === 'partner-vja-elec-1')!,
    }))
    .filter((it) => it.fulfillment && it.fulfillment.status !== 'DELIVERED');

  const totalAvailableStock = retailerInventory.reduce((acc, it) => acc + it.available, 0);
  const lowStockItems = retailerInventory.filter((it) => it.available <= it.lowStockThreshold);

  // Today's metrics
  const todaySales = myStoreOrders.reduce((sum, o) => {
    const f = o.fulfillments.find((it) => it.partnerId === 'partner-vja-elec-1');
    const fTotal = f ? f.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0) : 0;
    return sum + fTotal;
  }, 0);

  const pendingSettlement = Math.round(todaySales * 0.945); // 5.5% commission deducted

  return (
    <div className="space-y-8 pb-8">
      {/* Top Welcome & Store Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Store Console • Besant Road, {currentCity}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Merchant Operations Overview
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/retailer/inventory"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-amber-400" />
            <span>Update / Import Stock</span>
          </Link>

          <Link
            to="/retailer/orders"
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Manage Orders</span>
          </Link>
        </div>
      </div>

      {/* DASHBOARD CARDS (Prompt Requirement) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* 1. Today's Orders */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Orders</span>
            <ShoppingCart className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{myStoreOrders.length}</div>
          <span className="text-[10px] text-emerald-600 font-bold block">+3 from yesterday</span>
        </div>

        {/* 2. Pending Orders */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Orders</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {pendingFulfillments.length}
          </div>
          <span className="text-[10px] text-slate-500 block">Needs packing / dispatch</span>
        </div>

        {/* 3. Available Stock */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available Stock</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalAvailableStock}</div>
          <span className="text-[10px] text-slate-500 block">Active listed units</span>
        </div>

        {/* 4. Low Stock */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">{lowStockItems.length}</div>
          <span className="text-[10px] text-rose-600 font-bold block">Restock required</span>
        </div>

        {/* 5. Sales */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            ₹{todaySales.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block">Gross merchant trade</span>
        </div>

        {/* 6. Pending Settlement */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Settlement</span>
            <IndianRupee className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            ₹{pendingSettlement.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Payout: Thursday</span>
        </div>
      </div>

      {/* Live Pending Fulfillments Stream */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Incoming Dispatch Stream</h3>
            <p className="text-xs text-slate-500">
              Orders requiring acceptance, packing, or handover to hyperlocal delivery pilot
            </p>
          </div>
          <Link
            to="/retailer/orders"
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {pendingFulfillments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No pending dispatch requests. All orders up to date!
          </div>
        ) : (
          <div className="space-y-3">
            {pendingFulfillments.map(({ order, fulfillment }) => (
              <div
                key={fulfillment.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sm text-slate-900">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                      Fulfillment #{fulfillment.fulfillmentIndex}
                    </span>
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-mono">
                      {fulfillment.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Customer: <strong>{order.customerName}</strong> ({order.deliveryAddress})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Items: {fulfillment.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                  </p>
                </div>

                {/* Instant Action Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {fulfillment.status === 'CONFIRMED' && (
                    <button
                      onClick={() =>
                        updateFulfillmentStatus(
                          order.id,
                          fulfillment.id,
                          'PARTNER_ACCEPTED',
                          'Accepted by Vijayawada Electricals counter'
                        )
                      }
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                    >
                      Accept Order
                    </button>
                  )}

                  {fulfillment.status === 'PARTNER_ACCEPTED' && (
                    <button
                      onClick={() =>
                        updateFulfillmentStatus(
                          order.id,
                          fulfillment.id,
                          'PREPARING',
                          'Counter staff packaging materials'
                        )
                      }
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-sm transition-colors"
                    >
                      Mark Preparing
                    </button>
                  )}

                  {fulfillment.status === 'PREPARING' && (
                    <button
                      onClick={() =>
                        updateFulfillmentStatus(
                          order.id,
                          fulfillment.id,
                          'PACKED',
                          'Package sealed with warranty tag. Awaiting driver.'
                        )
                      }
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                    >
                      Mark Ready (Packed)
                    </button>
                  )}

                  {fulfillment.status === 'PACKED' && (
                    <button
                      onClick={() =>
                        updateFulfillmentStatus(
                          order.id,
                          fulfillment.id,
                          'OUT_FOR_DELIVERY',
                          `Handover completed with OTP ${fulfillment.handoverOtp}`
                        )
                      }
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold shadow-sm transition-colors"
                    >
                      Handover to Delivery
                    </button>
                  )}

                  <Link
                    to="/retailer/orders"
                    className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
                    title="Detailed view"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low Stock Warning Box */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-extrabold text-slate-900">Low Stock Alerts in Your Counter</h3>
          </div>
          <Link
            to="/retailer/inventory"
            className="text-xs font-bold text-amber-600 hover:text-amber-700"
          >
            Adjust Stock Levels
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {lowStockItems.map((it) => (
            <div
              key={it.sku}
              className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-center justify-between"
            >
              <div>
                <span className="font-mono text-[10px] text-slate-400 block font-bold">{it.sku}</span>
                <span className="font-bold text-slate-900">{it.productName}</span>
                <span className="text-[11px] text-rose-700 block mt-0.5">
                  Only {it.available} left (Threshold: {it.lowStockThreshold})
                </span>
              </div>
              <Link
                to="/retailer/inventory"
                className="px-3 py-1.5 bg-white border border-rose-200 text-rose-800 hover:bg-rose-100 rounded-lg font-bold"
              >
                + Restock
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
