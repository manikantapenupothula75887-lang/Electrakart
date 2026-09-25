import React, { useState } from 'react';
import {
  Wrench,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  Star,
  Clock,
  Phone,
  MapPin,
  FileText,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { ElectricianProfile } from '../../types';

export const AdminElectriciansPage: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING_VERIFICATION' | 'APPROVED' | 'SUSPENDED'>('ALL');
  const [selectedElectrician, setSelectedElectrician] = useState<ElectricianProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Electrician dataset
  const [electricians, setElectricians] = useState<ElectricianProfile[]>([
    {
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
      latitude: 16.51,
      longitude: 80.64,
      idProofUrl: 'https://docs.electrakart.in/kyc/aadhaar_ramesh.pdf',
      licenseUrl: 'https://docs.electrakart.in/kyc/license_ramesh.pdf',
      inspectionFeeInr: 199,
      verificationStatus: 'APPROVED',
      isOnline: true,
      isBusy: false,
      ratingAvg: 4.8,
      ratingCount: 34,
      completedJobsCount: 42,
      specializations: ['FANS', 'WIRING', 'SWITCHES_SOCKETS', 'MCB_DISTRIBUTION_BOARDS', 'HOME_ELECTRICAL_REPAIRS'],
      createdAt: '2026-02-10T10:00:00Z',
      updatedAt: '2026-03-01T12:00:00Z',
    },
    {
      id: 'elec-vja-105',
      userId: 'usr-elec-5',
      fullName: 'Mohammad Riaz',
      phone: '+91 97011 88990',
      email: 'riaz.electricals@gmail.com',
      experienceYears: 4,
      serviceRadiusKm: 8,
      city: 'Vijayawada',
      pincode: '520012',
      address: 'Near Old Bus Stand, Autonagar, Vijayawada',
      latitude: 16.49,
      longitude: 80.66,
      idProofUrl: 'https://docs.electrakart.in/kyc/voter_riaz.pdf',
      inspectionFeeInr: 179,
      verificationStatus: 'PENDING_VERIFICATION',
      isOnline: false,
      isBusy: false,
      ratingAvg: 0.0,
      ratingCount: 0,
      completedJobsCount: 0,
      specializations: ['MOTORS', 'PUMPS', 'WIRING', 'INSTALLATION'],
      createdAt: '2026-03-20T14:30:00Z',
      updatedAt: '2026-03-20T14:30:00Z',
    },
    {
      id: 'elec-vja-106',
      userId: 'usr-elec-6',
      fullName: 'Kishore Babu',
      phone: '+91 94411 33445',
      email: 'kishore.elec@gmail.com',
      experienceYears: 10,
      serviceRadiusKm: 15,
      city: 'Vijayawada',
      pincode: '520003',
      address: 'Door 2-18, Moghalrajpuram, Vijayawada',
      latitude: 16.515,
      longitude: 80.645,
      idProofUrl: 'https://docs.electrakart.in/kyc/aadhaar_kishore.pdf',
      licenseUrl: 'https://docs.electrakart.in/kyc/iti_kishore.pdf',
      inspectionFeeInr: 249,
      verificationStatus: 'PENDING_VERIFICATION',
      isOnline: false,
      isBusy: false,
      ratingAvg: 0.0,
      ratingCount: 0,
      completedJobsCount: 0,
      specializations: ['ELECTRICAL_PANELS', 'INVERTER_UPS', 'COMMERCIAL_ELECTRICAL_REPAIRS'],
      createdAt: '2026-03-21T09:15:00Z',
      updatedAt: '2026-03-21T09:15:00Z',
    },
    {
      id: 'elec-vja-107',
      userId: 'usr-elec-7',
      fullName: 'Gopi Krishna',
      phone: '+91 98855 66778',
      email: 'gopi.k@gmail.com',
      experienceYears: 2,
      serviceRadiusKm: 5,
      city: 'Vijayawada',
      pincode: '520010',
      address: 'Patamata, Vijayawada',
      latitude: 16.495,
      longitude: 80.65,
      inspectionFeeInr: 149,
      verificationStatus: 'SUSPENDED',
      rejectionReason: 'Repeated non-attendance for confirmed customer appointments.',
      isOnline: false,
      isBusy: false,
      ratingAvg: 3.2,
      ratingCount: 6,
      completedJobsCount: 4,
      specializations: ['FANS', 'LIGHTS'],
      createdAt: '2026-01-15T08:00:00Z',
      updatedAt: '2026-03-10T16:20:00Z',
    },
  ]);

  const handleApprove = (id: string) => {
    setElectricians((prev) =>
      prev.map((e) => (e.id === id ? { ...e, verificationStatus: 'APPROVED', rejectionReason: undefined } : e))
    );
    setSelectedElectrician(null);
  };

  const handleRejectConfirm = () => {
    if (!selectedElectrician || !rejectionReason.trim()) return;
    setElectricians((prev) =>
      prev.map((e) =>
        e.id === selectedElectrician.id
          ? { ...e, verificationStatus: 'REJECTED', rejectionReason: rejectionReason.trim(), isOnline: false }
          : e
      )
    );
    setShowRejectModal(false);
    setSelectedElectrician(null);
    setRejectionReason('');
  };

  const handleSuspend = (id: string) => {
    setElectricians((prev) =>
      prev.map((e) => (e.id === id ? { ...e, verificationStatus: 'SUSPENDED', isOnline: false } : e))
    );
    setSelectedElectrician(null);
  };

  const filtered = electricians.filter((e) => {
    if (filterStatus !== 'ALL' && e.verificationStatus !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.phone.includes(q) ||
        e.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = electricians.filter((e) => e.verificationStatus === 'PENDING_VERIFICATION').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-500" />
            <span>Electrician Marketplace Governance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Super Admin verification, KYC compliance audit, status suspension, and performance metrics.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3">
          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Registered</div>
            <div className="text-base font-black text-slate-900">{electricians.length}</div>
          </div>
          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] uppercase font-bold text-amber-600">Pending Review</div>
            <div className="text-base font-black text-amber-600">{pendingCount}</div>
          </div>
          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] uppercase font-bold text-emerald-600">Active Online</div>
            <div className="text-base font-black text-emerald-600">
              {electricians.filter((e) => e.isOnline).length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl max-w-fit">
          {(['ALL', 'PENDING_VERIFICATION', 'APPROVED', 'SUSPENDED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL'
                ? 'All Electricians'
                : status === 'PENDING_VERIFICATION'
                ? `Pending Review (${pendingCount})`
                : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, city..."
            className="pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs w-full sm:w-64 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
      </div>

      {/* Electricians Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Technician Name</th>
                <th className="py-3 px-4">City & Radius</th>
                <th className="py-3 px-4">Specializations</th>
                <th className="py-3 px-4">Fee / Exp</th>
                <th className="py-3 px-4">Rating / Jobs</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((elec) => (
                <tr key={elec.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{elec.fullName}</span>
                      {elec.isOnline && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
                      )}
                    </div>
                    <div className="text-[11px] font-normal text-slate-500">{elec.phone}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold">{elec.city}</div>
                    <div className="text-[10px] text-slate-500">{elec.serviceRadiusKm} km coverage</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {elec.specializations.slice(0, 3).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-700">
                          {s.replace('_', ' ')}
                        </span>
                      ))}
                      {elec.specializations.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500 font-bold">
                          +{elec.specializations.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-black text-slate-900">₹{elec.inspectionFeeInr}</div>
                    <div className="text-[10px] text-slate-500">{elec.experienceYears} yrs exp</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 font-bold text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{elec.ratingAvg}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{elec.completedJobsCount} jobs completed</div>
                  </td>

                  <td className="py-3.5 px-4">
                    {elec.verificationStatus === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                    ) : elec.verificationStatus === 'PENDING_VERIFICATION' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                        <Clock className="w-3 h-3" /> Needs Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                        <XCircle className="w-3 h-3" /> {elec.verificationStatus}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedElectrician(elec)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KYC REVIEW MODAL */}
      {selectedElectrician && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Electrician KYC & Profile Audit</h3>
                <p className="text-xs text-slate-500">ID: {selectedElectrician.id} • {selectedElectrician.fullName}</p>
              </div>
              <button
                onClick={() => setSelectedElectrician(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Contact Info</span>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedElectrician.fullName}</div>
                  <div className="text-slate-600">{selectedElectrician.phone}</div>
                  <div className="text-slate-600">{selectedElectrician.email}</div>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Location & Coverage</span>
                  <div className="text-slate-700 mt-0.5">{selectedElectrician.address}</div>
                  <div className="text-slate-600 font-semibold">{selectedElectrician.city} - {selectedElectrician.pincode}</div>
                  <div className="text-amber-600 font-bold mt-0.5">{selectedElectrician.serviceRadiusKm} km service radius</div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Uploaded KYC Documents</span>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="font-bold text-slate-800">Government ID Proof</div>
                        <div className="text-[10px] text-slate-400">Aadhaar / Voter ID</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Verified</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="font-bold text-slate-800">License / ITI Certificate</div>
                        <div className="text-[10px] text-slate-400">Electrical Wireman License</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Submitted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Specializations */}
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Approved Specializations</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {selectedElectrician.specializations.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
                    {s.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Governance Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <div>
                {selectedElectrician.verificationStatus === 'APPROVED' ? (
                  <button
                    onClick={() => handleSuspend(selectedElectrician.id)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200"
                  >
                    Suspend Electrician
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowRejectModal(true);
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Reject Application
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedElectrician(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  Close
                </button>
                {selectedElectrician.verificationStatus !== 'APPROVED' && (
                  <button
                    onClick={() => handleApprove(selectedElectrician.id)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Activate</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900">Specify Rejection Reason</h3>
            <p className="text-xs text-slate-500">
              Please enter the mandatory reason for rejecting this electrician registration application.
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete ID proof submitted. Please upload clear front and back copy of Aadhaar card."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim()}
                onClick={handleRejectConfirm}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
