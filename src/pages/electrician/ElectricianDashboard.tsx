import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Power,
  ShieldCheck,
  AlertCircle,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Navigation,
  Star,
  IndianRupee,
  ChevronRight,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react';
import { ElectricianServiceRequest, ElectricianProfile } from '../../types';

export const ElectricianDashboard: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [profile, setProfile] = useState<ElectricianProfile>({
    id: 'elec-vja-101',
    userId: 'usr-elec-1',
    fullName: 'Ramesh Kumar',
    phone: '+91 98490 11223',
    email: 'ramesh.electrician@gmail.com',
    experienceYears: 7,
    serviceRadiusKm: 10,
    city: 'Vijayawada',
    pincode: '520002',
    address: 'Shop 14, Main Bazaar, Governorpet, Vijayawada',
    latitude: 16.5100,
    longitude: 80.6400,
    inspectionFeeInr: 199,
    verificationStatus: 'APPROVED',
    isOnline: true,
    isBusy: false,
    ratingAvg: 4.8,
    ratingCount: 34,
    completedJobsCount: 42,
    specializations: [
      'FANS',
      'WIRING',
      'SWITCHES_SOCKETS',
      'MCB_DISTRIBUTION_BOARDS',
      'INVERTER_UPS',
      'HOME_ELECTRICAL_REPAIRS',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Simulated live available incoming requests
  const [incomingRequests, setIncomingRequests] = useState<ElectricianServiceRequest[]>([
    {
      id: 'req-101',
      requestNumber: 'SR-2026-884920',
      customerId: 'usr-cust-1',
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+91 98481 99882',
      category: 'FANS',
      description: 'BLDC ceiling fan is making high humming noise and speed regulator is unresponsive.',
      address: 'Flat 301, Sri Sai Residency, Guru Nanak Colony',
      city: 'Vijayawada',
      pincode: '520008',
      latitude: 16.5050,
      longitude: 80.6500,
      preferredTime: 'IMMEDIATE',
      status: 'REQUESTED',
      inspectionFeeInr: 199,
      requestedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: 'req-102',
      requestNumber: 'SR-2026-319482',
      customerId: 'usr-cust-2',
      customerName: 'Priya Sharma',
      customerPhone: '+91 98765 43210',
      category: 'MCB_DISTRIBUTION_BOARDS',
      description: 'Main 32A MCB trips whenever AC and Geyser are turned on simultaneously.',
      address: 'Plot 42, Gayatri Nagar',
      city: 'Vijayawada',
      pincode: '520008',
      latitude: 16.5000,
      longitude: 80.6550,
      preferredTime: 'SCHEDULED',
      status: 'REQUESTED',
      inspectionFeeInr: 199,
      requestedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
  ]);

  // Active accepted job
  const [activeJob, setActiveJob] = useState<ElectricianServiceRequest | null>(null);
  const [acceptanceNotice, setAcceptanceNotice] = useState<string | null>(null);

  // Toggle online/offline
  const handleToggleOnline = () => {
    if (profile.verificationStatus !== 'APPROVED') return;
    setIsOnline(!isOnline);
  };

  // Accept a service request atomically
  const handleAcceptRequest = (request: ElectricianServiceRequest) => {
    // Remove from available incoming list
    setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
    
    // Set active job with status ACCEPTED and timestamps
    const acceptedJob: ElectricianServiceRequest = {
      ...request,
      status: 'ACCEPTED',
      assignedElectricianId: profile.id,
      electricianName: profile.fullName,
      electricianPhone: profile.phone,
      acceptedAt: new Date().toISOString(),
      customerNotifiedAt: new Date().toISOString(),
    };

    setActiveJob(acceptedJob);
    setAcceptanceNotice(`Request #${request.requestNumber} accepted successfully! Customer has been notified.`);
    setTimeout(() => setAcceptanceNotice(null), 5000);
  };

  // Reject a service request
  const handleRejectRequest = (requestId: string) => {
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  // Step progression of active job
  const handleProgressStatus = (nextStatus: ElectricianServiceRequest['status']) => {
    if (!activeJob) return;

    if (nextStatus === 'COMPLETED') {
      // Completed job
      setProfile(prev => ({
        ...prev,
        completedJobsCount: prev.completedJobsCount + 1,
      }));
      setActiveJob(null);
      setAcceptanceNotice('Job successfully completed! Total inspection fee ₹199 collected.');
      setTimeout(() => setAcceptanceNotice(null), 5000);
    } else {
      setActiveJob({
        ...activeJob,
        status: nextStatus,
      });
    }
  };

  // Stream live GPS telemetry to backend when ON_THE_WAY
  useEffect(() => {
    if (!activeJob || activeJob.status !== 'ON_THE_WAY') return;

    const sendTelemetry = (lat: number, lon: number, heading?: number, speed?: number) => {
      fetch('/api/v1/electricians/me/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          heading: heading || 45,
          speed: speed || 20,
          jobId: activeJob.id,
        }),
      }).catch(() => {});
    };

    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          sendTelemetry(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.heading || undefined,
            pos.coords.speed || undefined
          );
        },
        () => {
          // Graceful fallback coordinates for testing
          sendTelemetry(16.512, 80.642, 45, 20);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [activeJob?.id, activeJob?.status]);

  return (
    <div className="space-y-6">
      {/* Verification Status Banner */}
      {profile.verificationStatus === 'PENDING_VERIFICATION' ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Application Under Super Admin Verification</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Your profile and uploaded documents (Aadhaar & Electrician License) are currently being reviewed by
              the ElectraKart verification team. Once approved, you will be able to go online and accept service requests.
            </p>
          </div>
        </div>
      ) : profile.verificationStatus === 'APPROVED' ? (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Verified Marketplace Partner</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-700">Service Radius: {profile.serviceRadiusKm} km</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Eligible to receive direct customer bookings and on-demand repair requests across {profile.city}.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleOnline}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              isOnline
                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm'
                : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnline ? 'Go Offline' : 'Go Online'}</span>
          </button>
        </div>
      ) : null}

      {/* Acceptance Notification Alert */}
      {acceptanceNotice && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="text-xs font-bold">{acceptanceNotice}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Rating</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{profile.ratingAvg}</span>
            <span className="text-xs text-slate-500">({profile.ratingCount} reviews)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Completed Jobs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{profile.completedJobsCount}</span>
            <span className="text-xs text-emerald-600 font-semibold">100% Verified</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Inspection Fee</span>
            <IndianRupee className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">₹{profile.inspectionFeeInr}</span>
            <span className="text-xs text-slate-500">Base visit fee</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Estimated Earnings</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">₹{(profile.completedJobsCount * 350).toLocaleString('en-IN')}</span>
            <span className="text-xs text-slate-500">Direct client payout</span>
          </div>
        </div>
      </div>

      {/* ACTIVE JOB CARD (If accepted) */}
      {activeJob && (
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border-2 border-amber-400 p-5 shadow-md">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                ACTIVE JOB IN PROGRESS
              </span>
              <span className="text-xs font-mono font-bold text-slate-700">#{activeJob.requestNumber}</span>
            </div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Status: {activeJob.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400">Customer & Contact</h4>
              <div className="text-sm font-bold text-slate-900 mt-1">{activeJob.customerName}</div>
              <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a href={`tel:${activeJob.customerPhone}`} className="hover:underline font-medium">
                  {activeJob.customerPhone}
                </a>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-600 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{activeJob.address}, {activeJob.city} - {activeJob.pincode}</span>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeJob.latitude},${activeJob.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>Open in Google Maps Navigation</span>
              </a>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400">Problem Details</h4>
              <div className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                Category: {activeJob.category.replace('_', ' ')}
              </div>
              <p className="text-xs text-slate-700 mt-2 bg-white/70 p-2.5 rounded-xl border border-amber-200/60 leading-relaxed">
                "{activeJob.description}"
              </p>
              <div className="text-xs text-slate-500 mt-2">
                Inspection Charge: <strong className="text-slate-800">₹{activeJob.inspectionFeeInr}</strong> (collect on completion)
              </div>
            </div>
          </div>

          {/* Forward State Machine Progression Buttons */}
          <div className="mt-5 pt-4 border-t border-amber-200 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700">Update Job Progression:</span>
            {activeJob.status === 'ACCEPTED' && (
              <button
                onClick={() => handleProgressStatus('ON_THE_WAY')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Step 1: Start Moving (On the Way)
              </button>
            )}

            {activeJob.status === 'ON_THE_WAY' && (
              <button
                onClick={() => handleProgressStatus('ARRIVED')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Step 2: Mark Arrived at Customer Location
              </button>
            )}

            {activeJob.status === 'ARRIVED' && (
              <button
                onClick={() => handleProgressStatus('WORK_STARTED')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Step 3: Begin Work & Inspection
              </button>
            )}

            {activeJob.status === 'WORK_STARTED' && (
              <button
                onClick={() => handleProgressStatus('COMPLETED')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Step 4: Finish Work & Mark Completed
              </button>
            )}
          </div>
        </div>
      )}

      {/* INCOMING SERVICE REQUESTS FEED */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Nearby Incoming Service Requests</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              {isOnline ? `${incomingRequests.length} Available` : 'Offline'}
            </span>
          </div>

          {!isOnline && (
            <span className="text-xs text-rose-600 font-semibold">
              Turn online above to accept incoming requests.
            </span>
          )}
        </div>

        {!isOnline ? (
          <div className="py-12 text-center text-slate-400">
            <Power className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">You are currently offline</p>
            <p className="text-xs text-slate-400 mt-1">Switch status to online to start receiving nearby customer requests.</p>
          </div>
        ) : incomingRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No open service requests in your area</p>
            <p className="text-xs text-slate-400 mt-1">New requests within your 10 km service radius will appear here in real time.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {incomingRequests.map((req) => (
              <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{req.customerName}</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                      {req.category.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">#{req.requestNumber}</span>
                  </div>

                  <p className="text-xs text-slate-600 max-w-xl">
                    {req.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {req.city} ({req.pincode}) ~ 2.4 km away
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {req.preferredTime === 'IMMEDIATE' ? 'Immediate Service' : 'Scheduled Visit'}
                    </span>
                    <span className="text-amber-600 font-semibold">
                      Fee: ₹{req.inspectionFeeInr}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRejectRequest(req.id)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
                  >
                    Ignore
                  </button>
                  <button
                    onClick={() => handleAcceptRequest(req)}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all hover:scale-102"
                  >
                    Accept Job
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Specializations & Profile Badges */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Registered Skills & Specializations</h3>
        <div className="flex flex-wrap gap-2 mt-3">
          {profile.specializations.map((spec) => (
            <span
              key={spec}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200/60"
            >
              {spec.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
