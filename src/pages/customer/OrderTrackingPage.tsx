import React, { useState, useEffect } from 'react';
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
  FileText,
  Printer,
  X,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Download,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus } from '../../types';
import { LiveTrackingMap } from '../../components/delivery/LiveTrackingMap';
import { downloadCustomerInvoicePdf } from '../../utils/pdfGenerator';

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { orders, cancelOrder, services } = useStore();

  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed site requirements / schedule change');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [liveTelemetry, setLiveTelemetry] = useState<Record<string, any>>({});

  // Find target order or fallback to first
  const order = orders.find((o) => o.id === id || o.orderNumber === id) || orders[0];

  // Real-Time Server-Sent Events (SSE) telemetry connection
  useEffect(() => {
    if (!order?.id) return;

    // Fetch initial carrier tracking snapshot
    fetch(`/api/v1/deliveries/bookings/${order.id}/tracking`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.telemetry) {
          setLiveTelemetry((prev) => ({
            ...prev,
            [data.fulfillmentId || 'default']: data,
          }));
        }
      })
      .catch(() => {});

    // Open persistent SSE channel to order topic
    const es = new EventSource(`/api/v1/realtime/stream?channel=order:${order.id}`);

    es.addEventListener('DELIVERY_LOCATION_UPDATED', (evt: MessageEvent) => {
      try {
        const parsed = JSON.parse(evt.data);
        const payload = parsed.payload;
        if (payload) {
          setLiveTelemetry((prev) => ({
            ...prev,
            [payload.fulfillmentId || 'default']: {
              ...prev[payload.fulfillmentId || 'default'],
              telemetry: payload,
              status: 'OUT_FOR_DELIVERY',
            },
          }));
        }
      } catch (err) {
        console.error('[SSE Error] Failed to parse location update:', err);
      }
    });

    es.addEventListener('DELIVERY_STATUS_CHANGED', (evt: MessageEvent) => {
      try {
        const parsed = JSON.parse(evt.data);
        const payload = parsed.payload;
        if (payload) {
          setLiveTelemetry((prev) => ({
            ...prev,
            [payload.fulfillmentId || 'default']: {
              ...prev[payload.fulfillmentId || 'default'],
              status: payload.status,
            },
          }));
        }
      } catch (err) {
        console.error('[SSE Error] Failed to parse status update:', err);
      }
    });

    return () => {
      es.close();
    };
  }, [order?.id]);

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

  const isCancellable =
    order.overallStatus !== 'CANCELLED' &&
    order.overallStatus !== 'DELIVERED' &&
    !order.fulfillments.some(
      (f) => f.status === 'DISPATCHED' || f.status === 'OUT_FOR_DELIVERY' || f.status === 'DELIVERED'
    );

  const handleOpenInvoice = async () => {
    setIsLoadingInvoice(true);
    setShowInvoice(true);
    try {
      const inv = await services.order.getInvoice(order.id);
      if (inv) {
        setInvoiceData(inv);
      } else {
        setInvoiceData({
          invoiceNumber: `INV-${order.orderNumber}`,
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          billingAddress: order.deliveryAddress,
          shippingAddress: order.deliveryAddress,
          items: order.fulfillments.flatMap((f) => f.items),
          subtotalInr: order.subtotal,
          discountInr: order.discount,
          deliveryFeeInr: order.deliveryFee,
          gstTotalInr: order.gstTotal,
          grandTotalInr: order.grandTotal,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
        });
      }
    } catch (err) {
      console.error('Failed to load invoice:', err);
      // Fallback
      setInvoiceData({
        invoiceNumber: `INV-${order.orderNumber}`,
        orderId: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        billingAddress: order.deliveryAddress,
        shippingAddress: order.deliveryAddress,
        items: order.fulfillments.flatMap((f) => f.items),
        subtotalInr: order.subtotal,
        discountInr: order.discount,
        deliveryFeeInr: order.deliveryFee,
        gstTotalInr: order.gstTotal,
        grandTotalInr: order.grandTotal,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      });
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelOrder(order.id, cancelReason);
      setIsCancelling(false);
      setShowCancelModal(false);
    } catch (err: any) {
      console.error('Cancellation failed:', err);
      setIsCancelling(false);
      setCancelError(
        err?.response?.data?.error || err?.message || 'Failed to cancel order. Please contact customer support.'
      );
    }
  };

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
            <span
              className={`text-xs font-extrabold px-3 py-1 rounded-full border uppercase ${
                order.overallStatus === 'CANCELLED'
                  ? 'bg-rose-500/20 text-rose-800 border-rose-500/30'
                  : order.overallStatus === 'DELIVERED'
                  ? 'bg-emerald-500/20 text-emerald-800 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-800 border-amber-500/30'
              }`}
            >
              {order.overallStatus.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Placed on {order.createdAt} &bull; Delivery to {order.customerName} ({order.city})
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-3">
          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-400 block font-mono">Total Paid</span>
            <span className="font-mono font-black text-xl text-slate-900">
              ₹{order.grandTotal.toLocaleString('en-IN')}
            </span>
            <span
              className={`text-[11px] font-bold block ${
                order.paymentStatus === 'REFUNDED'
                  ? 'text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block font-mono'
                  : order.paymentStatus === 'PAID'
                  ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block font-mono'
                  : 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block font-mono'
              }`}
            >
              {order.paymentMethod} &bull; {order.paymentStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Tax Invoice</span>
            </button>

            {isCancellable && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cancel Order</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Notice Banner */}
      {order.overallStatus === 'CANCELLED' ? (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-rose-900">
              Order Cancelled &bull; Reserved Inventory Released &bull; Refund Initiated
            </h4>
            <p className="text-xs text-rose-800 leading-relaxed">
              All reserved store inventories have been atomically released back to retailer stock.
              A full refund of ₹{order.grandTotal.toLocaleString('en-IN')} has been initiated to your source payment method ({order.paymentMethod}).
            </p>
          </div>
        </div>
      ) : (
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
      )}

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

              {/* ZOMATO / SWIGGY STYLE LIVE VEHICLE TRACKING MAP */}
              {(ful.status === 'DISPATCHED' ||
                ful.status === 'OUT_FOR_DELIVERY' ||
                ful.status === 'DELIVERED' ||
                liveTelemetry[ful.id]?.telemetry) && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-amber-500" />
                      <span>Live Pilot GPS Telemetry & Route Tracking</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Real-time SSE Stream
                    </span>
                  </div>

                  <LiveTrackingMap
                    pickup={{
                      name: ful.partnerName,
                      address: ful.partnerAddress,
                      latitude: 16.5062,
                      longitude: 80.648,
                      type: ful.partnerType,
                    }}
                    drop={{
                      name: order.customerName,
                      address: order.deliveryAddress,
                      latitude: 16.515,
                      longitude: 80.635,
                    }}
                    telemetry={
                      liveTelemetry[ful.id]?.telemetry || {
                        latitude: 16.5105,
                        longitude: 80.6415,
                        distanceRemainingKm: 2.1,
                        etaMinutes: 11,
                        heading: 40,
                        speed: 26,
                        recordedAt: new Date().toISOString(),
                      }
                    }
                    rider={{
                      name: ful.driverName || liveTelemetry[ful.id]?.rider?.name || 'Suresh Kumar (Logistics Partner)',
                      phone: ful.driverPhone || liveTelemetry[ful.id]?.rider?.phone || '+91 98765 43210',
                      vehicleNumber: liveTelemetry[ful.id]?.rider?.vehicleNumber || 'AP 16 BK 4892',
                    }}
                    status={liveTelemetry[ful.id]?.status || ful.status}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TAX INVOICE MODAL */}
      {showInvoice && invoiceData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
                    EK
                  </div>
                  <span className="font-black text-lg text-slate-900 tracking-tight">ElectraKart</span>
                </div>
                <span className="text-[10px] uppercase font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                  Tax Invoice / Cash Memo
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-1">GSTIN: 37AAACE9921K1Z8 &bull; State: Andhra Pradesh (37)</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoice(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Invoice Number</span>
                <span className="font-bold text-slate-900">{invoiceData.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Order Ref</span>
                <span className="font-bold text-slate-900">{order.orderNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Date</span>
                <span className="text-slate-700">{order.createdAt}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Billed &amp; Shipped To</span>
                <span className="font-bold text-slate-900 block">{order.customerName} ({order.customerPhone})</span>
                <span className="text-slate-600 block">{order.deliveryAddress}, {order.city} - {order.pincode}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Payment Method</span>
                <span className="font-bold text-emerald-700">{order.paymentMethod} ({order.paymentStatus})</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Rate (₹)</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.fulfillments.flatMap((f) => f.items).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</span>
                      </td>
                      <td className="p-3 text-center font-mono">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-3 text-right font-mono">
                        ₹{item.unitPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tax & Total Summary */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-2">
              <div className="text-[11px] text-slate-500 max-w-xs space-y-1">
                <p className="font-bold text-slate-700">Tax Breakdown (18% GST Authoritative):</p>
                <p>&bull; Central GST (CGST @ 9%): ₹{Math.round(order.gstTotal / 2).toLocaleString('en-IN')}</p>
                <p>&bull; State GST (SGST @ 9%): ₹{Math.round(order.gstTotal / 2).toLocaleString('en-IN')}</p>
                <p className="pt-1 text-[10px] text-slate-400">
                  This is a computer-generated tax invoice issued by ElectraKart Hyperlocal Platform.
                </p>
              </div>

              <div className="w-full sm:w-64 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{order.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>GST Total (18%):</span>
                  <span>₹{order.gstTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charge:</span>
                  <span>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}</span>
                </div>
                <div className="pt-2 border-t-2 border-slate-900 flex justify-between font-black text-sm text-slate-950">
                  <span>Total Amount:</span>
                  <span>₹{order.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowInvoice(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!invoiceData || !order) return;
                  downloadCustomerInvoicePdf({
                    invoiceNumber: invoiceData.invoiceNumber || `INV-${order.orderNumber}`,
                    orderNumber: order.orderNumber,
                    orderDate: invoiceData.date || new Date().toISOString().split('T')[0],
                    customerName: invoiceData.customerName || order.customerName || 'Customer',
                    customerPhone: invoiceData.customerPhone || order.customerPhone,
                    deliveryAddress: order.deliveryAddress,
                    items: (invoiceData.items || order.fulfillments.flatMap((f) => f.items)).map((it: any) => ({
                      name: it.productName || it.name || 'Electrical Material',
                      quantity: it.quantity || 1,
                      unitPrice: it.unitPrice || it.price || 0,
                      totalPrice: (it.unitPrice || it.price || 0) * (it.quantity || 1),
                    })),
                    subtotal: invoiceData.subtotal || order.subtotal,
                    gstTotal: invoiceData.taxTotal || order.gstTotal,
                    deliveryFee: invoiceData.deliveryFee ?? order.deliveryFee,
                    grandTotal: invoiceData.grandTotal || order.grandTotal,
                    paymentMethod: invoiceData.paymentMethod || order.paymentMethod || 'Online UPI Payment',
                    paymentStatus: invoiceData.paymentStatus || order.paymentStatus || 'PAID',
                  });
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER CANCELLATION CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Cancel Order {order.orderNumber}?</h3>
                  <span className="text-[11px] text-slate-500">Atomic inventory release &amp; 100% refund</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 text-xs text-rose-900 rounded-2xl space-y-1">
              <span className="font-bold block">Cancellation Policy Terms:</span>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Cancelling this order will release all {order.fulfillments.flatMap((f) => f.items).length} reserved line items back to the participating store inventories immediately.
                A full refund of <strong>₹{order.grandTotal.toLocaleString('en-IN')}</strong> will be issued to your {order.paymentMethod} account.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Reason for Cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-rose-500"
              >
                <option value="Changed site requirements / schedule change">Changed site requirements / schedule change</option>
                <option value="Ordered incorrect wire gauge / specifications">Ordered incorrect wire gauge / specifications</option>
                <option value="Found alternate local availability">Found alternate local availability</option>
                <option value="Customer requested cancellation before dispatch">Customer requested cancellation before dispatch</option>
              </select>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl text-xs">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Releasing Inventory &amp; Refunding...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation &amp; Refund</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
