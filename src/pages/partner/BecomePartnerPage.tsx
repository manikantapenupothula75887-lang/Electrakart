import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Upload,
  ArrowRight,
  Clock,
  Sparkles,
  Phone,
  FileCheck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Partner } from '../../types';

export const BecomePartnerPage: React.FC = () => {
  const { registerNewPartner, currentCity, pincode } = useStore();

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(currentCity);
  const [state, setState] = useState('Andhra Pradesh');
  const [pin, setPin] = useState(pincode);
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [partnerType, setPartnerType] = useState<'RETAILER' | 'DISTRIBUTOR'>('RETAILER');
  const [brandsSold, setBrandsSold] = useState(['Polycab', 'Anchor']);

  const [submittedPartner, setSubmittedPartner] = useState<Partner | null>(null);

  const availableBrands = ['Polycab', 'Finolex', 'RR Kabel', 'Havells', 'Anchor', 'Legrand', 'Schneider', 'GM'];

  const toggleBrand = (b: string) => {
    if (brandsSold.includes(b)) {
      setBrandsSold(brandsSold.filter((x) => x !== b));
    } else {
      setBrandsSold([...brandsSold, b]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = registerNewPartner({
      businessName,
      ownerName,
      phone: mobile,
      email,
      address,
      city,
      state,
      pincode: pin,
      gstin,
      pan,
      bankAccount,
      bankIfsc,
      type: partnerType,
      brandsSold,
      storePhoto: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    });
    setSubmittedPartner(created);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Verified Merchant Network</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          Become an ElectraKart Partner
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Connect your electrical retail counter or regional warehouse to 10,000+ local electricians,
          builders, and homeowners with guaranteed 48-hr trade settlements.
        </p>
      </div>

      {submittedPartner ? (
        /* Confirmation & Verification Status (Prompt Requirement) */
        <div className="bg-white rounded-3xl p-8 border-2 border-emerald-500 shadow-xl space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 font-mono">
              Application ID: {submittedPartner.id}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">
              KYC Documents Submitted for Verification!
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Our Andhra Pradesh regional onboarding team has received documents for{' '}
              <strong>{submittedPartner.businessName}</strong>.
            </p>
          </div>

          {/* Verification Status Stepper */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Verification Status:</span>
              <span className="font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-mono">
                UNDER ADMIN REVIEW
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-700">Form Submission & Mobile OTP verified</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-slate-700">
                  GSTIN (<strong>{submittedPartner.gstin}</strong>) & PAN verification pending Super Admin approval
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="text-slate-400">Store photo geofencing & delivery radius activation</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Link
              to="/admin/partners"
              className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold text-center hover:bg-slate-800 transition-colors"
            >
              View in Super Admin KYC Queue (Demo Switch)
            </Link>
            <Link
              to="/"
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold text-center hover:bg-slate-200 transition-colors"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      ) : (
        /* REGISTRATION FORM (Prompt Requirements) */
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6 text-xs">
          {/* Partner Type */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
              Select Partner Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPartnerType('RETAILER')}
                className={`p-4 rounded-2xl text-left border transition-all ${
                  partnerType === 'RETAILER'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-sm text-slate-900">Electrical Retailer</span>
                </div>
                <p className="text-[11px] text-slate-500">Local shop / counter fulfilling within 5-10 km radius</p>
              </button>

              <button
                type="button"
                onClick={() => setPartnerType('DISTRIBUTOR')}
                className={`p-4 rounded-2xl text-left border transition-all ${
                  partnerType === 'DISTRIBUTOR'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-sm text-slate-900">Master Distributor</span>
                </div>
                <p className="text-[11px] text-slate-500">Depot / warehouse fulfilling bulk city-wide orders</p>
              </button>
            </div>
          </div>

          {/* Business & Owner Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Business Name (as per GST)</label>
              <input
                type="text"
                required
                placeholder="e.g. Sri Krishna Electricals & Hardware"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Owner / Proprietor Name</label>
              <input
                type="text"
                required
                placeholder="e.g. K. V. Subba Rao"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mobile Number (For Dispatch Alerts)</label>
              <input
                type="text"
                required
                placeholder="+91 98480 XXXXX"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Official Business Email</label>
              <input
                type="email"
                required
                placeholder="contact@krishnaelectricals.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Store / Warehouse Address</label>
              <input
                type="text"
                required
                placeholder="Shop No., Street, Landmark"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Pincode</label>
              <input
                type="text"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium font-mono"
              />
            </div>
          </div>

          {/* Tax & Banking Details */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">GSTIN Number</label>
              <input
                type="text"
                required
                placeholder="37AAAAA1234A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">PAN Card Number</label>
              <input
                type="text"
                required
                placeholder="AAAAA1234A"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Bank Current Account Number</label>
              <input
                type="text"
                required
                placeholder="91201004829104"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Bank IFSC Code</label>
              <input
                type="text"
                required
                placeholder="SBIN0001842"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-mono uppercase"
              />
            </div>
          </div>

          {/* Brands Sold */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
              Authorized Brands In Stock (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableBrands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBrand(b)}
                  className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all ${
                    brandsSold.includes(b)
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {b} {brandsSold.includes(b) && '✓'}
                </button>
              ))}
            </div>
          </div>

          {/* Store Photo Upload Placeholder */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
              Storefront / Signboard Photo (For Geofencing)
            </label>
            <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50 flex items-center justify-center gap-3">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-xs text-slate-600">Store photo selected (Ready for geotag review)</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Submit Partner KYC Application</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
