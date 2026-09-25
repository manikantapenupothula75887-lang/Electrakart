import React, { useState } from 'react';
import {
  Wrench,
  Search,
  MapPin,
  Star,
  ShieldCheck,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ElectricianSpecialization, ElectricianServiceRequest } from '../../types';
import { LiveTrackingMap } from '../../components/delivery/LiveTrackingMap';

interface ElectricianCardItem {
  id: string;
  fullName: string;
  phone: string;
  experienceYears: number;
  ratingAvg: number;
  ratingCount: number;
  completedJobsCount: number;
  inspectionFeeInr: number;
  distanceKm: number;
  city: string;
  pincode: string;
  specializations: ElectricianSpecialization[];
  isOnline: boolean;
}

const CATEGORIES: { id: ElectricianSpecialization; label: string; icon: string }[] = [
  { id: 'WIRING', label: 'Wiring & Cables', icon: '⚡' },
  { id: 'FANS', label: 'Fans & Regulators', icon: '🌀' },
  { id: 'LIGHTS', label: 'Lights & Fixtures', icon: '💡' },
  { id: 'SWITCHES_AND_SOCKETS', label: 'Switches & Sockets', icon: '🔌' },
  { id: 'MCB_DB', label: 'MCB & Distribution Boards', icon: '🛡️' },
  { id: 'ELECTRICAL_PANELS', label: 'Electrical Panels', icon: '🎛️' },
  { id: 'INVERTER_UPS', label: 'Inverter & UPS', icon: '🔋' },
  { id: 'MOTORS', label: 'Motors & Starters', icon: '⚙️' },
  { id: 'PUMPS', label: 'Water Pumps', icon: '🚰' },
  { id: 'APPLIANCE_INSTALLATION', label: 'Appliance Setup', icon: '🔧' },
  { id: 'REPAIR', label: 'Troubleshooting & Repair', icon: '🛠️' },
  { id: 'MAINTENANCE', label: 'Safety & Audit', icon: '🔍' },
  { id: 'SOLAR_INVERTER', label: 'Solar & Rooftop Panels', icon: '☀️' },
  { id: 'SMART_HOME', label: 'Smart Home Automation', icon: '📱' },
  { id: 'COMMERCIAL_ELECTRICAL', label: 'Commercial Systems', icon: '🏢' },
  { id: 'INDUSTRIAL_ELECTRICAL', label: 'Industrial Heavy Panels', icon: '🏭' },
  { id: 'OTHER', label: 'General Electrical Services', icon: '⚡' },
];

export const FindElectricianPage: React.FC = () => {
  const { currentCity, pincode } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<ElectricianSpecialization>('FANS');
  const [preferredTime, setPreferredTime] = useState<'IMMEDIATE' | 'SCHEDULED'>('IMMEDIATE');
  const [problemDescription, setProblemDescription] = useState('');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [targetElectrician, setTargetElectrician] = useState<ElectricianCardItem | null>(null);

  // Active tracking state
  const [activeRequest, setActiveRequest] = useState<ElectricianServiceRequest | null>(null);

  // Rating modal state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Deterministic local verified electricians
  const availableElectricians: ElectricianCardItem[] = [
    {
      id: 'elec-vja-101',
      fullName: 'Ramesh Kumar',
      phone: '+91 98490 11223',
      experienceYears: 7,
      ratingAvg: 4.8,
      ratingCount: 34,
      completedJobsCount: 42,
      inspectionFeeInr: 199,
      distanceKm: 2.1,
      city: 'Vijayawada',
      pincode: '520002',
      specializations: ['FANS', 'WIRING', 'SWITCHES_SOCKETS', 'MCB_DISTRIBUTION_BOARDS', 'HOME_ELECTRICAL_REPAIRS'],
      isOnline: true,
    },
    {
      id: 'elec-vja-102',
      fullName: 'Srinivasa Rao',
      phone: '+91 94401 22334',
      experienceYears: 12,
      ratingAvg: 4.9,
      ratingCount: 68,
      completedJobsCount: 89,
      inspectionFeeInr: 249,
      distanceKm: 3.4,
      city: 'Vijayawada',
      pincode: '520008',
      specializations: ['MCB_DISTRIBUTION_BOARDS', 'ELECTRICAL_PANELS', 'INVERTER_UPS', 'WIRING', 'MOTORS'],
      isOnline: true,
    },
    {
      id: 'elec-vja-103',
      fullName: 'Venkat Reddy',
      phone: '+91 99881 44556',
      experienceYears: 4,
      ratingAvg: 4.6,
      ratingCount: 19,
      completedJobsCount: 26,
      inspectionFeeInr: 179,
      distanceKm: 4.2,
      city: 'Vijayawada',
      pincode: '520010',
      specializations: ['FANS', 'LIGHTS', 'SWITCHES_SOCKETS', 'HOME_ELECTRICAL_REPAIRS', 'INSTALLATION'],
      isOnline: true,
    },
    {
      id: 'elec-vja-104',
      fullName: 'Bhavani Shankar',
      phone: '+91 97003 55667',
      experienceYears: 9,
      ratingAvg: 4.7,
      ratingCount: 45,
      completedJobsCount: 58,
      inspectionFeeInr: 199,
      distanceKm: 5.0,
      city: 'Vijayawada',
      pincode: '520003',
      specializations: ['PUMPS', 'MOTORS', 'INVERTER_UPS', 'WIRING', 'COMMERCIAL_ELECTRICAL_REPAIRS'],
      isOnline: true,
    },
  ];

  // Filter electricians matching category
  const filteredElectricians = availableElectricians.filter((elec) =>
    elec.specializations.includes(selectedCategory)
  );

  const handleOpenBooking = (elec: ElectricianCardItem) => {
    setTargetElectrician(elec);
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetElectrician) return;

    const newReq: ElectricianServiceRequest = {
      id: `req-${Date.now()}`,
      requestNumber: `SR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      customerId: 'usr-cust-1',
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+91 98481 99882',
      category: selectedCategory,
      description: problemDescription || `Service required for ${selectedCategory.replace('_', ' ')}`,
      address: 'Flat 301, Sri Sai Residency, Guru Nanak Colony',
      city: currentCity,
      pincode: pincode,
      latitude: 16.5050,
      longitude: 80.6500,
      preferredTime: preferredTime,
      status: 'ACCEPTED',
      assignedElectricianId: targetElectrician.id,
      electricianName: targetElectrician.fullName,
      electricianPhone: targetElectrician.phone,
      inspectionFeeInr: targetElectrician.inspectionFeeInr,
      requestedAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
      customerNotifiedAt: new Date().toISOString(),
    };

    setActiveRequest(newReq);
    setBookingModalOpen(false);
    setProblemDescription('');
  };

  const handleCancelActiveRequest = () => {
    if (!activeRequest) return;
    setActiveRequest({
      ...activeRequest,
      status: 'CANCELLED',
      cancellationReason: 'Cancelled by customer',
    });
    setTimeout(() => setActiveRequest(null), 3000);
  };

  const handleCompleteAndRate = () => {
    if (!activeRequest) return;
    setActiveRequest({
      ...activeRequest,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
    });
    setRatingModalOpen(true);
  };

  const handleSubmitRating = (e: React.FormEvent) => {
    e.preventDefault();
    setRatingSubmitted(true);
    setTimeout(() => {
      setRatingModalOpen(false);
      setRatingSubmitted(false);
      setActiveRequest(null);
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold">
            <Wrench className="w-3.5 h-3.5" />
            <span>ElectraKart Verified Technician Marketplace</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100">
            Find an Electrician Near You in {currentCity}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Connect directly with verified local electrical technicians. Transparent starting inspection fee from ₹179,
            zero false promises, and genuine customer ratings.
          </p>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              100% Background Verified
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-amber-400" />
              Service in 30–60 mins
            </span>
          </div>
        </div>

        {/* Subtle decorative background icon */}
        <Wrench className="absolute -bottom-6 -right-6 w-48 h-48 text-white/5 pointer-events-none transform -rotate-12" />
      </div>

      {/* ACTIVE SERVICE REQUEST TRACKING CARD */}
      {activeRequest && (
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-black text-amber-950">LIVE SERVICE REQUEST ACTIVE</span>
              <span className="text-xs font-mono font-bold text-slate-600">#{activeRequest.requestNumber}</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-bold uppercase">
              {activeRequest.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase text-slate-500">Assigned Technician</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">{activeRequest.electricianName}</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-700 mt-1">
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <a href={`tel:${activeRequest.electricianPhone}`} className="font-bold hover:underline">
                  {activeRequest.electricianPhone}
                </a>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase text-slate-500">Service Category & Fee</div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">
                {activeRequest.category.replace('_', ' ')}
              </div>
              <div className="text-xs text-amber-700 font-semibold mt-1">
                Inspection Charge: ₹{activeRequest.inspectionFeeInr}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {activeRequest.status !== 'COMPLETED' && (
                <>
                  <button
                    onClick={handleCancelActiveRequest}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteAndRate}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                  >
                    Mark Job Done & Rate
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Live Technician Map Tracking when ON_THE_WAY */}
          {activeRequest.status === 'ON_THE_WAY' && (
            <div className="pt-3 border-t border-amber-200">
              <div className="text-xs font-bold text-amber-950 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Live Technician Transit towards your site:</span>
              </div>
              <LiveTrackingMap
                pickup={{
                  name: activeRequest.electricianName || 'Verified Electrician',
                  address: 'Verified Technician Depot',
                  latitude: 16.508,
                  longitude: 80.645,
                }}
                drop={{
                  name: 'Service Site Address',
                  address: activeRequest.address,
                  latitude: activeRequest.latitude || 16.515,
                  longitude: activeRequest.longitude || 80.635,
                }}
                telemetry={{
                  latitude: 16.512,
                  longitude: 80.64,
                  distanceRemainingKm: 1.4,
                  etaMinutes: 8,
                  heading: 30,
                  speed: 22,
                  recordedAt: new Date().toISOString(),
                }}
                rider={{
                  name: activeRequest.electricianName,
                  phone: activeRequest.electricianPhone,
                  vehicleNumber: 'Service Pilot',
                }}
                status="ON_THE_WAY"
              />
            </div>
          )}
        </div>
      )}

      {/* Category Selection Filter Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Select Your Electrical Issue Category</span>
          </h2>
          <span className="text-xs text-slate-500">Showing electricians matching selected skill</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-xs scale-101'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="text-xs leading-snug">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Electricians Listing Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
            Available Verified Electricians ({filteredElectricians.length})
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span>Near {currentCity} ({pincode})</span>
          </div>
        </div>

        {filteredElectricians.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">No technicians available for this category right now</p>
            <p className="text-xs text-slate-400 mt-1">Please select another problem category or check back shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredElectricians.map((elec) => (
              <div
                key={elec.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{elec.fullName}</h4>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 text-amber-600 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {elec.ratingAvg} ({elec.ratingCount} reviews)
                        </span>
                        <span>•</span>
                        <span>{elec.experienceYears} yrs experience</span>
                        <span>•</span>
                        <span className="text-slate-600 font-semibold">{elec.distanceKm} km away</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Inspection Fee</div>
                      <div className="text-lg font-black text-slate-900">₹{elec.inspectionFeeInr}</div>
                    </div>
                  </div>

                  {/* Skills badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {elec.specializations.map((spec) => (
                      <span
                        key={spec}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                          spec === selectedCategory
                            ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {spec.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Available Now
                  </span>

                  <button
                    onClick={() => handleOpenBooking(elec)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all hover:scale-102 flex items-center gap-1.5"
                  >
                    <span>Request Electrician</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOOKING MODAL */}
      {bookingModalOpen && targetElectrician && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Book Electrician Service</h3>
                <p className="text-xs text-slate-500">Technician: {targetElectrician.fullName}</p>
              </div>
              <button
                onClick={() => setBookingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Problem Category</label>
                <input
                  type="text"
                  disabled
                  value={selectedCategory.replace('_', ' ')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Describe Your Electrical Issue *
                </label>
                <textarea
                  required
                  rows={3}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="e.g. Ceiling fan speed regulator is unresponsive and wire is loose in switchboard..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Timing Preference</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPreferredTime('IMMEDIATE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      preferredTime === 'IMMEDIATE'
                        ? 'bg-amber-50 border-amber-400 text-amber-950'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Immediate (30-60 Mins)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredTime('SCHEDULED')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      preferredTime === 'SCHEDULED'
                        ? 'bg-amber-50 border-amber-400 text-amber-950'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Schedule Later Today
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Starting Inspection Charge:</span>
                  <span className="font-bold text-slate-900">₹{targetElectrician.inspectionFeeInr}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  * Payable directly to the technician after inspection. Repair parts & wiring materials can be ordered via ElectraKart.
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all"
              >
                Confirm & Request Electrician
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RATING & REVIEW MODAL */}
      {ratingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in">
            {ratingSubmitted ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-slate-900">Thank You for Your Review!</h4>
                <p className="text-xs text-slate-500">Your feedback helps maintain quality across our verified electrician network.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRating} className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Rate Your Electrician Service</h3>
                  <p className="text-xs text-slate-500">How was your service experience with Ramesh Kumar?</p>
                </div>

                <div className="flex justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      className="p-1 hover:scale-115 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= selectedRating
                            ? 'text-amber-500 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Review (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="e.g. Arrived on time, quickly fixed the ceiling fan wiring with proper insulation."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRatingModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
                  >
                    Skip
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-xs"
                  >
                    Submit Rating
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
