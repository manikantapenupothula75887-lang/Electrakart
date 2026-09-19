import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const OrdersHistoryPage: React.FC = () => {
  const { orders } = useStore();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Your Electrical Orders</h1>
        <p className="text-xs text-slate-500 mt-1">
          Track active shipments and download GST tax invoices
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-800">No orders placed yet</h3>
          <p className="text-xs text-slate-500">Your electrical purchases and estimate orders will appear here.</p>
          <Link
            to="/customer/shop"
            className="inline-block px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-slate-300 shadow-xs transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-extrabold text-base text-slate-900">
                    {order.orderNumber}
                  </span>
                  <span className="text-xs bg-amber-500/20 text-amber-800 font-bold px-2.5 py-0.5 rounded-full uppercase">
                    {order.overallStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-slate-500">Placed on {order.createdAt}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Delivery Destination
                  </span>
                  <span className="text-slate-800 font-medium line-clamp-2">{order.deliveryAddress}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Fulfillment Centers
                  </span>
                  <span className="text-slate-800 font-bold block">
                    {order.fulfillments.length} Stores ({order.city})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {order.fulfillments.map((f) => f.partnerName.split(' ')[0]).join(', ')}
                  </span>
                </div>

                <div className="text-right flex flex-col justify-between items-end">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Paid</span>
                    <span className="font-mono font-extrabold text-base text-slate-900">
                      ₹{order.grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <Link
                    to={`/customer/orders/${order.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 mt-2"
                  >
                    <span>Track Live Status</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
