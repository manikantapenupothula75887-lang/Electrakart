import React, { useState } from 'react';
import { User, MapPin, ShieldCheck, CreditCard, Building2, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AccountPage: React.FC = () => {
  const { currentCity, pincode } = useStore();
  const [name, setName] = useState('Anil Kumar Reddy');
  const [phone, setPhone] = useState('+91 98481 99882');
  const [email, setEmail] = useState('anil.reddy@gmail.com');
  const [gstin, setGstin] = useState('37ABCDE1234F1Z9');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Your Trade Account</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage business GST details, contractor credit limits, and delivery locations
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Profile and GST credentials updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-amber-500" />
          <span>Contractor / Customer Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mobile Number (Verified)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">GSTIN (For B2B Tax Credit)</label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium font-mono uppercase"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Current Hub: <strong>{currentCity} ({pincode})</strong>
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
