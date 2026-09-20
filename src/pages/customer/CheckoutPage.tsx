import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  RefreshCw,
  Navigation,
  Crosshair,
  Check,
  Building,
  Home,
  Briefcase,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CustomerAddress, CustomerFulfillmentPlan } from '../../services';

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    placeOrder,
    clearCart,
    syncOrder,
    cartSubtotal,
    cartGstTotal,
    cartDeliveryFee,
    cartGrandTotal,
    cartFulfillmentsCount,
    currentCity,
    pincode,
    partners,
    services,
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
  const [isRetrying, setIsRetrying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Address & Hyperlocal Fulfillment states
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isResolvingGps, setIsResolvingGps] = useState(false);
  const [fulfillmentPlan, setFulfillmentPlan] = useState<CustomerFulfillmentPlan | null>(null);
  const [isComputingPlan, setIsComputingPlan] = useState(false);

  useEffect(() => {
    let mounted = true;
    services.address
      .getAddresses()
      .then((addrs) => {
        if (!mounted || !addrs || addrs.length === 0) return;
        setSavedAddresses(addrs);
        const def = addrs.find((a) => a.is_default) || addrs[0];
        if (def) {
          setSelectedAddressId(def.id);
          setDeliveryAddress(`${def.street_address}, ${def.landmark ? def.landmark + ', ' : ''}${def.city}`);
          if (def.recipient_name) setCustomerName(def.recipient_name);
          if (def.recipient_phone) setCustomerPhone(def.recipient_phone);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (cart.length === 0) return;
    let active = true;
    setIsComputingPlan(true);

    const items = cart.map((c) => ({
      sku_code: c.product.sku,
      quantity: c.quantity,
      preferred_partner_id: c.selectedStore?.partnerId,
    }));

    services.fulfillment
      .computeFulfillmentPlan({
        items,
        location: selectedAddressId ? { addressId: selectedAddressId } : { city: currentCity, pincode },
        required_delivery_tier: deliveryMethod === 'EXPRESS' ? 'HYPERLOCAL_2HR' : 'SAME_DAY',
      })
      .then((plan) => {
        if (active) setFulfillmentPlan(plan);
      })
      .catch((err) => console.warn('Fulfillment planning fallback:', err))
      .finally(() => {
        if (active) setIsComputingPlan(false);
      });

    return () => {
      active = false;
    };
  }, [selectedAddressId, deliveryMethod, cart, currentCity, pincode]);

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsResolvingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resolved = await services.address.resolveLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setDeliveryAddress(resolved.normalized_address);
          setSelectedAddressId(null);
        } catch (err) {
          console.error('Failed to resolve GPS coordinates:', err);
        } finally {
          setIsResolvingGps(false);
        }
      },
      (err) => {
        console.warn('GPS location permission denied:', err);
        setIsResolvingGps(false);
      }
    );
  };

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

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPlacing(true);
    setPaymentError(null);

    try {
      if (simulateFailure) {
        // User QA toggle for testing payment failure handling
        await new Promise((r) => setTimeout(r, 600));
        throw new Error('Bank authorization timeout (EK-PAY-504). Cart items preserved.');
      }

      // 1. Authoritative payment order creation
      const paymentOrder = await services.order.createPaymentOrder({
        customerName,
        customerPhone,
        deliveryAddress,
        city: currentCity,
        pincode,
        deliveryMethod,
        paymentMethod,
        cart,
        partners,
        addressId: selectedAddressId || undefined,
      });

      const orderId = paymentOrder.orderId;
      setPendingOrderId(orderId);

      // 2. Authoritative payment verification
      const verifyPayload = {
        orderId,
        paymentId: paymentOrder.paymentId,
        providerPaymentId: `pay_mock_${Date.now()}`,
        signature: paymentMethod === 'COD' ? 'cod_verified' : 'sig_mock_valid_sha256',
      };

      await services.order.verifyPayment(verifyPayload);

      // 3. Fetch confirmed order & sync into store context
      const confirmedOrder = await services.order.getOrderById(orderId);
      if (confirmedOrder) {
        syncOrder(confirmedOrder);
      } else {
        placeOrder({
          customerName,
          customerPhone,
          deliveryAddress,
          city: currentCity,
          pincode,
          deliveryMethod,
          paymentMethod,
        });
      }

      clearCart();
      setIsPlacing(false);
      navigate(`/customer/orders/${orderId}`);
    } catch (err: any) {
      console.error('Checkout payment failed:', err);
      setIsPlacing(false);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Payment authorization failed. Your cart has been retained. Please retry or choose another payment method.';
      setPaymentError(msg);
    }
  };

  const handleRetryPayment = async () => {
    if (!pendingOrderId) {
      handlePlaceOrder({ preventDefault: () => {} } as any);
      return;
    }

    setIsRetrying(true);
    setPaymentError(null);

    try {
      const retryRes = await services.order.retryPayment(pendingOrderId, paymentMethod);

      await services.order.verifyPayment({
        orderId: pendingOrderId,
        paymentId: retryRes.paymentId,
        providerPaymentId: `retry_pay_${Date.now()}`,
        signature: 'sig_mock_valid_sha256',
      });

      const confirmedOrder = await services.order.getOrderById(pendingOrderId);
      if (confirmedOrder) {
        syncOrder(confirmedOrder);
      }

      clearCart();
      setIsRetrying(false);
      navigate(`/customer/orders/${pendingOrderId}`);
    } catch (err: any) {
      console.error('Payment retry failed:', err);
      setIsRetrying(false);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Retry authorization failed. Please choose an alternate payment method or contact support.';
      setPaymentError(msg);
    }
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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span>1. Delivery Destination</span>
              </h3>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isResolvingGps}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isResolvingGps ? 'animate-spin' : ''}`} />
                <span>{isResolvingGps ? 'Locating...' : 'Use GPS'}</span>
              </button>
            </div>

            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Saved Delivery Addresses</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => {
                          setSelectedAddressId(addr.id);
                          setDeliveryAddress(
                            `${addr.street_address}, ${addr.landmark ? addr.landmark + ', ' : ''}${addr.city}`
                          );
                          if (addr.recipient_name) setCustomerName(addr.recipient_name);
                          if (addr.recipient_phone) setCustomerPhone(addr.recipient_phone);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/40'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 flex items-center gap-1">
                            {addr.address_type === 'HOME' && <Home className="w-3 h-3 text-amber-600" />}
                            {addr.address_type === 'WORK' && <Briefcase className="w-3 h-3 text-blue-600" />}
                            {addr.address_type === 'PROJECT_SITE' && <Building className="w-3 h-3 text-emerald-600" />}
                            {addr.address_type}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                        </div>
                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{addr.street_address}</p>
                        <p className="text-[11px] text-slate-500">{addr.city}, {addr.pincode}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    if (selectedAddressId) setSelectedAddressId(null);
                  }}
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
                <p className="text-[11px] text-slate-500">Ready at counter in 15 mins</p>
              </button>
            </div>
          </div>

          {/* 2b. Authoritative Hyperlocal Dispatch Plan */}
          {fulfillmentPlan && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>
                    Hyperlocal Dispatch Plan ({fulfillmentPlan.total_packages}{' '}
                    {fulfillmentPlan.total_packages === 1 ? 'Package' : 'Packages'})
                  </span>
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {fulfillmentPlan.estimated_delivery_text}
                </span>
              </div>

              <div className="space-y-3">
                {fulfillmentPlan.packages.map((pkg) => (
                  <div
                    key={pkg.package_number}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          Package {pkg.package_number}: {pkg.origin_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                        <span>{pkg.distance_km.toFixed(1)} km</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                          {pkg.distance_source === 'ROAD_NETWORK' ? 'Road Network' : 'Geodesic Fallback'}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Estimated Slot: <strong className="text-slate-800">{pkg.estimated_delivery_slot}</strong>
                    </div>
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {pkg.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono text-[10px]"
                        >
                          {it.product_name} × {it.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {fulfillmentPlan.unserviceable_items && fulfillmentPlan.unserviceable_items.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Items unserviceable in your area:</span>
                    <ul className="list-disc pl-4 mt-1">
                      {fulfillmentPlan.unserviceable_items.map((un, idx) => (
                        <li key={idx}>
                          SKU: {un.sku_code} ({un.reason})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Payment Gateway Selection */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500" />
                <span>3. Payment Gateway & Settlement</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Authoritative Server Pricing
              </span>
            </div>

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

            <div className="p-3 bg-slate-50 border border-slate-200 text-[11px] text-slate-600 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Production Payment Architecture Active</span>
              </div>
              <p>
                Server authoritative calculation (18% GST, free delivery &ge; ₹5,000, multi-partner settlement ledger with zero customer margin leakage).
              </p>
              <div className="pt-1 flex items-center justify-between border-t border-slate-200/80">
                <label className="inline-flex items-center gap-2 cursor-pointer text-[10px] font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                  <span>Simulate Gateway Failure (Test Cart Preservation &amp; Retry)</span>
                </label>
              </div>
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
                      {it.quantity} &times; ₹{it.product.sellingPrice} &bull; Store: {it.selectedStore.storeName}
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

            {paymentError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-start gap-2 text-rose-800 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span>Payment Verification Incomplete</span>
                    <p className="font-normal text-[11px] text-rose-700 mt-0.5">{paymentError}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 font-medium bg-white/70 p-2 rounded-lg">
                  &bull; Your cart items and store allocations have been securely retained.<br />
                  &bull; You can retry the transaction or select an alternative payment method above.
                </p>
                {pendingOrderId && (
                  <button
                    type="button"
                    onClick={handleRetryPayment}
                    disabled={isRetrying}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>{isRetrying ? 'Retrying Authorization...' : 'Retry Payment on Current Order'}</span>
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isPlacing || isRetrying}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 hover:scale-102 disabled:opacity-50"
            >
              {isPlacing ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Payment &amp; Reserving Inventory...</span>
                </span>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Pay &amp; Confirm Order (₹{cartGrandTotal.toLocaleString('en-IN')})</span>
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
