import React, { useState } from 'react';
import {
  Truck,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
} from 'lucide-react';
import { DeliveryBooking } from '../../types';

export const AdminDeliveriesPage: React.FC = () => {
  // Provider status simulation
  const [providerConfigured] = useState(false); // Demonstrating clear RAPIDO_NOT_CONFIGURED state
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Delivery bookings dataset
  const [bookings, setBookings] = useState<DeliveryBooking[]>([
    {
      id: 'del-vja-901',
      orderId: 'ORD-2026-0081',
      fulfillmentId: 'ful-vja-101',
      idempotencyKey: 'rapido_booking_ORD-2026-0081_ful-vja-101',
      provider: 'rapido',
      providerBookingId: 'RPD-VJA-849201',
      trackingUrl: 'https://track.rapido.bike/RPD-VJA-849201',
      status: 'IN_TRANSIT',
      pickupName: 'Vijayawada Electricals Depot',
      pickupPhone: '+91 98480 22334',
      pickupAddress: 'Shop 12, Besant Road, Governorpet',
      pickupCity: 'Vijayawada',
      pickupPincode: '520002',
      dropName: 'Anil Kumar Reddy',
      dropPhone: '+91 98481 99882',
      dropAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony',
      dropCity: 'Vijayawada',
      dropPincode: '520008',
      distanceKm: 3.8,
      riderName: 'Kalyan (Rapido Captain)',
      riderPhone: '+91 91234 56789',
      riderVehicleNumber: 'AP 16 CK 4589',
      estimatedDeliveryTime: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
      deliveryFeeInr: 45,
      retryCount: 0,
      createdAt: '2026-03-22T08:15:00Z',
      updatedAt: '2026-03-22T08:30:00Z',
    },
    {
      id: 'del-vja-902',
      orderId: 'ORD-2026-0079',
      fulfillmentId: 'ful-vja-102',
      idempotencyKey: 'rapido_booking_ORD-2026-0079_ful-vja-102',
      provider: 'rapido',
      providerBookingId: 'RPD-VJA-849188',
      trackingUrl: 'https://track.rapido.bike/RPD-VJA-849188',
      status: 'DELIVERED',
      pickupName: 'ABC Central Logistics Hub',
      pickupPhone: '+91 98480 33445',
      pickupAddress: 'Plot 48, APIIC Industrial Park',
      pickupCity: 'Vijayawada',
      pickupPincode: '520007',
      dropName: 'Satyanarayana',
      dropPhone: '+91 98765 12345',
      dropAddress: 'Moghalrajpuram Main Road',
      dropCity: 'Vijayawada',
      dropPincode: '520010',
      distanceKm: 5.2,
      riderName: 'Venkat (Rapido Captain)',
      riderPhone: '+91 98765 00112',
      riderVehicleNumber: 'AP 16 DB 7890',
      deliveryFeeInr: 60,
      retryCount: 0,
      createdAt: '2026-03-21T14:10:00Z',
      updatedAt: '2026-03-21T14:48:00Z',
    },
    {
      id: 'del-vja-903',
      orderId: 'ORD-2026-0082',
      fulfillmentId: 'ful-vja-103',
      idempotencyKey: 'rapido_booking_ORD-2026-0082_ful-vja-103',
      provider: 'rapido',
      status: 'FAILED',
      pickupName: 'Vijayawada Electricals Depot',
      pickupPhone: '+91 98480 22334',
      pickupAddress: 'Shop 12, Besant Road, Governorpet',
      pickupCity: 'Vijayawada',
      pickupPincode: '520002',
      dropName: 'Koteswara Rao',
      dropPhone: '+91 99881 22334',
      dropAddress: 'Gollapudi Bypass Road',
      dropCity: 'Vijayawada',
      dropPincode: '521225',
      distanceKm: 8.5,
      deliveryFeeInr: 0,
      retryCount: 1,
      lastError: 'Rapido API Error: No captains available in pickup zone (Governorpet).',
      createdAt: '2026-03-22T09:00:00Z',
      updatedAt: '2026-03-22T09:05:00Z',
    },
  ]);

  const handleRetry = (bookingId: string) => {
    setRetryingId(bookingId);
    setTimeout(() => {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: 'BOOKED',
                providerBookingId: `RPD-RETRY-${Date.now().toString().slice(-6)}`,
                trackingUrl: `https://track.rapido.bike/RPD-RETRY`,
                riderName: 'Assigned Captain (Rapido)',
                riderPhone: '+91 98480 99887',
                retryCount: b.retryCount + 1,
                lastError: undefined,
              }
            : b
        )
      );
      setRetryingId(null);
    }, 1500);
  };

  const filtered = bookings.filter((b) => {
    if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.orderId.toLowerCase().includes(q) ||
        b.dropName.toLowerCase().includes(q) ||
        (b.providerBookingId && b.providerBookingId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-500" />
            <span>Automated Delivery Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of automated courier dispatches, Rapido provider status, and retry mechanics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Bookings</div>
            <div className="text-base font-black text-slate-900">{bookings.length}</div>
          </div>
          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] uppercase font-bold text-blue-600">In Transit</div>
            <div className="text-base font-black text-blue-600">
              {bookings.filter((b) => b.status === 'IN_TRANSIT').length}
            </div>
          </div>
          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] uppercase font-bold text-rose-600">Failed / Alert</div>
            <div className="text-base font-black text-rose-600">
              {bookings.filter((b) => b.status === 'FAILED').length}
            </div>
          </div>
        </div>
      </div>

      {/* Provider Status Alert Card */}
      {!providerConfigured ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase">Provider Status: RAPIDO_NOT_CONFIGURED</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-200/70 text-amber-900 font-bold">
                  Fallback Carrier Active
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Rapido API credentials (<code>RAPIDO_API_KEY</code>, <code>RAPIDO_CLIENT_ID</code>) are not configured
                in the environment. Bookings are processed via fallback carrier simulation to preserve order flow without scraping or fake bookings.
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-xl whitespace-nowrap">
            Setup Required
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-emerald-900 uppercase">Provider Status: RAPIDO CONFIGURED</span>
              <p className="text-xs text-emerald-800 mt-0.5">
                Connected to official Rapido Hyperlocal Delivery API. Real-time driver allocation and webhooks active.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">
            Live Connected
          </span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl max-w-fit">
          {['ALL', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, customer, booking ID..."
            className="pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs w-full sm:w-64 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Order & Booking ID</th>
                <th className="py-3 px-4">Pickup Node</th>
                <th className="py-3 px-4">Customer Drop Address</th>
                <th className="py-3 px-4">Distance / Fee</th>
                <th className="py-3 px-4">Courier / Rider</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div>{b.orderId}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {b.providerBookingId || 'No Booking ID'}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{b.pickupName}</div>
                    <div className="text-[10px] text-slate-400">{b.pickupCity} ({b.pickupPincode})</div>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-semibold text-slate-800">{b.dropName}</div>
                    <div className="text-[10px] text-slate-500 truncate">{b.dropAddress}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-black text-slate-900">₹{b.deliveryFeeInr}</div>
                    <div className="text-[10px] text-slate-500">{b.distanceKm} km</div>
                  </td>

                  <td className="py-3.5 px-4">
                    {b.riderName ? (
                      <div>
                        <div className="font-bold text-slate-800">{b.riderName}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{b.riderPhone}</span>
                          {b.riderVehicleNumber && <span>• {b.riderVehicleNumber}</span>}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Awaiting Captain</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {b.status === 'DELIVERED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Delivered
                      </span>
                    ) : b.status === 'IN_TRANSIT' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                        <Truck className="w-3 h-3" /> In Transit
                      </span>
                    ) : b.status === 'BOOKED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                        <Clock className="w-3 h-3" /> Booked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                        <XCircle className="w-3 h-3" /> {b.status}
                      </span>
                    )}
                    {b.lastError && (
                      <div className="text-[10px] text-rose-600 mt-1 max-w-xs truncate" title={b.lastError}>
                        {b.lastError}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {b.status === 'FAILED' ? (
                        <button
                          onClick={() => handleRetry(b.id)}
                          disabled={retryingId === b.id}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${retryingId === b.id ? 'animate-spin' : ''}`} />
                          <span>Retry</span>
                        </button>
                      ) : b.trackingUrl ? (
                        <a
                          href={b.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Track</span>
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
