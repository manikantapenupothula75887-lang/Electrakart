import React, { useState } from 'react';
import {
  Users,
  Store,
  Building2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sliders,
  MapPin,
  Phone,
  Mail,
  Search,
  Check,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Partner, VerificationStatus } from '../../types';

export const AdminPartnersPage: React.FC = () => {
  const { partners, updatePartnerStatus } = useStore();
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Edit fields
  const [editCommission, setEditCommission] = useState<number>(5.5);
  const [editRadius, setEditRadius] = useState<number>(8.0);

  const pendingCount = partners.filter((p) => p.status === 'PENDING').length;

  const filtered = partners.filter((p) => {
    const matchesFilter =
      activeFilter === 'ALL' ||
      (activeFilter === 'PENDING' && p.status === 'PENDING') ||
      (activeFilter === 'VERIFIED' && p.status === 'VERIFIED') ||
      (activeFilter === 'RETAILER' && p.type === 'RETAILER') ||
      (activeFilter === 'DISTRIBUTOR' && p.type === 'DISTRIBUTOR');

    const matchesSearch =
      !search.trim() ||
      p.businessName.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase()) ||
      p.gstin.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleOpenPartnerModal = (partner: Partner) => {
    setSelectedPartner(partner);
    setEditCommission(partner.commissionRate);
    setEditRadius(partner.deliveryRadiusKm);
  };

  const handleApplyStatus = (newStatus: VerificationStatus) => {
    if (!selectedPartner) return;
    updatePartnerStatus(selectedPartner.id, newStatus, editCommission, editRadius);
    setToast(`${selectedPartner.businessName} updated to ${newStatus}!`);
    setSelectedPartner(null);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-8 pb-8">
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-rose-500/40 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            Network Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Partner KYC & Merchant Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Approve retail dealers, configure commission rates, and bind hyperlocal delivery radii
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Partners', count: partners.length },
            { id: 'PENDING', label: 'Pending Verification', count: pendingCount, highlight: pendingCount > 0 },
            { id: 'VERIFIED', label: 'Verified Active', count: partners.filter((p) => p.status === 'VERIFIED').length },
            { id: 'RETAILER', label: 'Retailers Only', count: partners.filter((p) => p.type === 'RETAILER').length },
            { id: 'DISTRIBUTOR', label: 'Distributors Only', count: partners.filter((p) => p.type === 'DISTRIBUTOR').length },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${
                activeFilter === f.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  f.highlight
                    ? 'bg-rose-500 text-white font-black animate-pulse'
                    : activeFilter === f.id
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by store or GSTIN..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 font-medium"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Partner Cards / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Partner Business</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">City & Address</th>
                <th className="py-3 px-3">GSTIN / PAN</th>
                <th className="py-3 px-3 text-center">Commission</th>
                <th className="py-3 px-3 text-center">Radius</th>
                <th className="py-3 px-3 text-center">KYC Status</th>
                <th className="py-3 px-4 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((partner) => (
                <tr key={partner.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-slate-900 text-xs">{partner.businessName}</div>
                    <span className="text-[11px] text-slate-500 block">Owner: {partner.ownerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{partner.phone}</span>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                        partner.type === 'DISTRIBUTOR'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {partner.type}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-600">
                    <span className="font-bold text-slate-800 block">{partner.city}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{partner.address}</span>
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-700">
                    <div>{partner.gstin}</div>
                    <span className="text-[10px] text-slate-400 block">{partner.pan}</span>
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                    {partner.commissionRate}%
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                    {partner.deliveryRadiusKm} km
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        partner.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : partner.status === 'PENDING'
                          ? 'bg-rose-100 text-rose-800 animate-pulse'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {partner.status.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleOpenPartnerModal(partner)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                    >
                      Configure / Verify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PARTNER INSPECTION & ACTION MODAL (Prompt Requirement) */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  Partner ID: {selectedPartner.id}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-0.5">
                  {selectedPartner.businessName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPartner(null)}
                className="text-slate-400 hover:text-slate-800 font-bold"
              >
                Close
              </button>
            </div>

            {/* KYC Details */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Owner</span>
                <span className="font-bold text-slate-900">{selectedPartner.ownerName}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Phone</span>
                <span className="font-mono text-slate-900">{selectedPartner.phone}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">GSTIN Verified</span>
                <span className="font-mono text-slate-900 font-bold">{selectedPartner.gstin}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Bank Account / IFSC</span>
                <span className="font-mono text-slate-900">{selectedPartner.bankAccount} ({selectedPartner.bankIfsc})</span>
              </div>
            </div>

            {/* Set Commission & Set Delivery Radius (Prompt Requirement) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Platform Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editCommission}
                  onChange={(e) => setEditCommission(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: 5.5% for retailers</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Hyperlocal Delivery Radius (km)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editRadius}
                  onChange={(e) => setEditRadius(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Orders routed within this radius</span>
              </div>
            </div>

            {/* Action Buttons as per spec: Approve, Reject, Suspend */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => handleApplyStatus('SUSPENDED')}
                className="px-4 py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-xl font-bold"
              >
                Suspend Partner
              </button>

              <button
                type="button"
                onClick={() => handleApplyStatus('REJECTED')}
                className="px-4 py-2 bg-rose-100 text-rose-800 hover:bg-rose-200 rounded-xl font-bold"
              >
                Reject KYC
              </button>

              <button
                type="button"
                onClick={() => handleApplyStatus('VERIFIED')}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Approve & Activate Partner</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
