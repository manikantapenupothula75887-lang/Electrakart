import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Truck,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowRight,
  Store,
  Zap,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    placeOrder,
    cartSubtotal,
    cartGstTotal,
    cartDeliveryFee,
    cartGrandTotal,
    cartFulfillmentsCount,
    currentCity,
    pincode,
  } = useStore();
  const navigate = useNavigate();

  // Form states
  const [customerName, setCustomerName] = useState('Anil Kumar Reddy');
  const [customerPhone, setCustomerPhone] = useState('+91 98481 99882');
  const [deliveryAddress, setDeliveryAddress] = useState(
    'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada'
  );
  const [deliveryMethod, setDeliveryMethod] = useState<'STANDARD' | 'EXPRESS' | 'PICKUP'>('EXPRESS');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'NET_BANKING' | 'TRADE_CREDIT' | 'COD'>('UPI');
  const [isPlacing, setIsPlacing] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold">Your cart is empty</h2>
        <Link to="/customer/shop" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
          Return to Shop
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPlacing(true);

    setTimeout(() => {
      const createdOrder = placeOrder({
        customerName,
        customerPhone,
        deliveryAddress,
        city: currentCity,
        pincode,
        deliveryMethod,
        paymentMethod,
      });

      setIsPlacing(false);
      navigate(`/customer/orders/${createdOrder.id}`);
    }, 800);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
          Final Verification
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
          Complete Your Electrical Order
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Fulfilling from {cartFulfillmentsCount} verified local suppliers in {currentCity}
        </p>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Delivery & Payment Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Customer & Address */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span>1. Delivery Destination</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Mobile Number (For OTP)</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Site / Residential Address
                </label>
                <textarea
                  rows={2}
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Delivery City: <strong>{currentCity}</strong> (Pincode: {pincode})
                </span>
              </div>
            </div>
          </div>

          {/* 2. Delivery Speed Method */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-500" />
              <span>2. Choose Delivery Speed</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryMethod('EXPRESS')}
                className={`p-4 rounded-2xl text-left border transition-all ${
                  deliveryMethod === 'EXPRESS'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs text-slate-900">Express Hyperlocal</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                    Popular
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">30–60 Min Delivery direct from nearest retailer</p>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod('STANDARD')}
                className={`p-4 rounded-2xl text-left border transition-all ${
                  deliveryMethod === 'STANDARD'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="font-extrabold text-xs text-slate-900 block mb-1">Standard Same-Day</span>
                <p className="text-[11px] text-slate-500">Scheduled evening delivery slot</p>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod('PICKUP')}
                className={`p-4 rounded-2xl text-left border transition-all ${
                  deliveryMethod === 'PICKUP'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="font-extrabold text-xs text-slate-900 block mb-1">Store Pickup</span>
                <p className="text-[11px] text-slate-500">Collect ready counter package via OTP</p>
              </button>
            </div>
          </div>

          {/* 3. Demo Payment Selection */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <span>3. Payment Gateway (Demo Integration Boundary)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'UPI', label: 'UPI (PhonePe, GPay, Paytm)', sub: 'Instant Zero-Fee Transfer' },
                { id: 'NET_BANKING', label: 'Corporate Net Banking', sub: 'SBI, HDFC, ICICI, Axis' },
                { id: 'TRADE_CREDIT', label: 'Contractor Trade Credit', sub: 'Pre-approved 15-Day Terms' },
                { id: 'COD', label: 'Cash on Site Delivery', sub: 'Verify on Unloading' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-3.5 rounded-2xl text-left border transition-all ${
                    paymentMethod === m.id
                      ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/40'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs text-slate-900 block">{m.label}</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">{m.sub}</span>
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 text-[11px] text-slate-500 rounded-xl">
              Clean API Boundary: Payment token verification placeholder active. In Phase 2, Razorpay/Cashfree
              SDK will attach seamlessly.
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Place Order */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Fulfillment Summary
            </h3>

            <div className="space-y-3">
              {cart.map((it) => (
                <div key={it.product.sku} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <div className="truncate pr-2">
                    <span className="font-bold text-slate-800 block truncate">{it.product.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {it.quantity} × ₹{it.product.sellingPrice} • Store: {it.selectedStore.storeName}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    ₹{(it.product.sellingPrice * it.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (18%):</span>
                <span>₹{cartGstTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery:</span>
                <span>{cartDeliveryFee === 0 ? 'FREE' : `₹${cartDeliveryFee}`}</span>
              </div>
              <div className="pt-2 border-t-2 border-slate-900 flex justify-between text-base font-black text-slate-950">
                <span>Total Payable:</span>
                <span>₹{cartGrandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPlacing}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 hover:scale-102 disabled:opacity-50"
            >
              {isPlacing ? (
                <span>Routing to Nearby Stores...</span>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Place Order (₹{cartGrandTotal.toLocaleString('en-IN')})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
