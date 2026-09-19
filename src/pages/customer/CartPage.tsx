import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Store,
  Clock,
  ShieldCheck,
  Truck,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CartItem } from '../../types';

export const CartPage: React.FC = () => {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    cartSubtotal,
    cartGstTotal,
    cartDeliveryFee,
    cartGrandTotal,
    cartFulfillmentsCount,
    currentCity,
    pincode,
  } = useStore();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Your Cart is Empty</h2>
        <p className="text-xs text-slate-500">
          Search products, browse the electrical catalog, or upload an estimate to add materials.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/customer/shop"
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Shop Electricals
          </Link>
          <Link
            to="/customer/estimate"
            className="px-5 py-2.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400 transition-colors"
          >
            Upload Estimate
          </Link>
        </div>
      </div>
    );
  }

  // Group cart items by partner location
  const groupedFulfillments = new Map<string, CartItem[]>();
  cart.forEach((item) => {
    const pId = item.selectedStore.partnerId;
    if (!groupedFulfillments.has(pId)) {
      groupedFulfillments.set(pId, []);
    }
    groupedFulfillments.get(pId)!.push(item);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Review Your Electrical Cart</h1>
        <p className="text-xs text-slate-500 mt-1">
          {cart.length} unique items • Multi-location smart fulfillment engine active
        </p>
      </div>

      {/* Multi-Location Smart Fulfillment Banner (Prompt Requirement) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {cartFulfillmentsCount > 1
                ? `Your order will be fulfilled from ${cartFulfillmentsCount} nearby locations in ${currentCity}.`
                : `Your order will be fulfilled from 1 verified store in ${currentCity}.`}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Items are grouped by local retailer or distributor for rapid parallel dispatch.
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[11px] font-bold text-slate-500 block">Delivery To:</span>
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1 justify-end">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            {currentCity} ({pincode})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Grouped Cart Items */}
        <div className="lg:col-span-8 space-y-6">
          {Array.from(groupedFulfillments.entries()).map(([partnerId, items], groupIndex) => {
            const storeInfo = items[0].selectedStore;
            return (
              <div
                key={partnerId}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4"
              >
                {/* Fulfillment Group Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 font-extrabold text-xs flex items-center justify-center font-mono">
                      #{groupIndex + 1}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                        {storeInfo.storeName}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {storeInfo.distanceKm} km away • {storeInfo.address}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Clock className="w-3 h-3" /> ETA: {storeInfo.deliveryEtaMin} mins
                    </span>
                  </div>
                </div>

                {/* Items in this group */}
                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <div key={item.product.sku} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                        />
                        <div className="space-y-1">
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            {item.product.sku}
                          </span>
                          <h5 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">
                            {item.product.name}
                          </h5>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>{item.product.brand}</span>
                            <span>•</span>
                            <span>{item.product.unit}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity and Price */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateCartQuantity(item.product.sku, item.quantity - 1)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 py-1 font-mono font-bold text-xs min-w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.product.sku, item.quantity + 1)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right min-w-20">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 block">
                            ₹{(item.product.sellingPrice * item.quantity).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ₹{item.product.sellingPrice}/unit
                          </span>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product.sku)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Order Financial Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Order Summary
            </h3>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>GST (18% Input Credit):</span>
                <span>₹{cartGstTotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Delivery & Handling:</span>
                {cartDeliveryFee === 0 ? (
                  <span className="text-emerald-700 font-bold">FREE (Orders &gt; ₹5,000)</span>
                ) : (
                  <span>₹{cartDeliveryFee}</span>
                )}
              </div>

              <div className="pt-3 border-t-2 border-slate-900 flex justify-between text-base font-black text-slate-950 font-mono">
                <span>Grand Total:</span>
                <span>₹{cartGrandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/customer/checkout')}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-2xl shadow-md transition-all hover:scale-102 flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-[11px] text-slate-400 text-center space-y-1">
              <p>Safe and verified trade checkout</p>
              <p>Zero internal dealer margins leaked</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
