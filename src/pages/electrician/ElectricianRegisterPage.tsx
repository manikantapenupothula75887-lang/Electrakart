import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Wrench,
  ShieldCheck,
  CheckCircle2,
  UploadCloud,
  FileText,
  MapPin,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ElectraKartLogo } from '../../components/common/ElectraKartLogo';
import { ElectricianSpecialization } from '../../types';

const SPECIALIZATION_OPTIONS: { id: ElectricianSpecialization; label: string }[] = [
  { id: 'WIRING', label: 'Wiring & Cable Fitting' },
  { id: 'FANS', label: 'Fans (Ceiling, Exhaust, BLDC)' },
  { id: 'LIGHTS', label: 'Lights & Fixtures' },
  { id: 'SWITCHES_AND_SOCKETS', label: 'Switches & Sockets' },
  { id: 'MCB_DB', label: 'MCB & Distribution Boards' },
  { id: 'ELECTRICAL_PANELS', label: 'Electrical Panels & Meter Boards' },
  { id: 'INVERTER_UPS', label: 'Inverter & UPS Setup' },
  { id: 'MOTORS', label: 'Motors & Starters' },
  { id: 'PUMPS', label: 'Water Pumps & Submersibles' },
  { id: 'APPLIANCE_INSTALLATION', label: 'New Appliance Installation' },
  { id: 'REPAIR', label: 'Repair & Troubleshooting' },
  { id: 'MAINTENANCE', label: 'Safety Audit & Preventive Maintenance' },
  { id: 'SOLAR_INVERTER', label: 'Solar Inverter & Rooftop Solar' },
  { id: 'SMART_HOME', label: 'Smart Home Automation & IoT' },
  { id: 'COMMERCIAL_ELECTRICAL', label: 'Commercial Electrical Systems' },
  { id: 'INDUSTRIAL_ELECTRICAL', label: 'Industrial Electrical & Heavy Machinery' },
  { id: 'OTHER', label: 'General Electrical Services' },
];

export const ElectricianRegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    experienceYears: 5,
    serviceRadiusKm: 10,
    address: '',
    city: 'Vijayawada',
    pincode: '520002',
    inspectionFeeInr: 199,
  });

  const [selectedSpecs, setSelectedSpecs] = useState<ElectricianSpecialization[]>([
    'FANS',
    'WIRING',
    'SWITCHES_SOCKETS',
    'HOME_ELECTRICAL_REPAIRS',
  ]);

  const [idProofUploaded, setIdProofUploaded] = useState(false);
  const [licenseUploaded, setLicenseUploaded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleSpec = (spec: ElectricianSpecialization) => {
    if (selectedSpecs.includes(spec)) {
      setSelectedSpecs(selectedSpecs.filter((s) => s !== spec));
    } else {
      setSelectedSpecs([...selectedSpecs, spec]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // After short delay, redirect to electrician portal
    setTimeout(() => {
      navigate('/electrician');
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Application Submitted!</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Thank you for registering as an ElectraKart Certified Electrician. Your KYC documents and profile are
            now in <strong>Pending Verification</strong> status. The Super Admin team will review and approve your credentials shortly.
          </p>
          <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-800 text-left border border-amber-200">
            <strong>Next Steps:</strong> You can access your dashboard right away to view your profile, manage specializations, and track verification status.
          </div>
          <button
            onClick={() => navigate('/electrician')}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-all"
          >
            Go to Electrician Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <ElectraKartLogo size="md" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
            <Wrench className="w-3.5 h-3.5" />
            <span>Technician Marketplace Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Join ElectraKart as a Certified Electrician
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Receive direct customer service requests, earn upfront inspection fees, and grow your local electrical service business with verified leads.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* 1. Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs flex items-center justify-center font-bold">1</span>
              Personal & Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98490 11223"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ramesh.electrician@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Experience & Service Radius */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs flex items-center justify-center font-bold">2</span>
              Experience & Coverage Area
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Years of Experience</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Radius: <strong className="text-amber-600">{formData.serviceRadiusKm} km</strong>
                </label>
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={formData.serviceRadiusKm}
                  onChange={(e) => setFormData({ ...formData, serviceRadiusKm: parseInt(e.target.value, 10) || 10 })}
                  className="w-full accent-amber-500 mt-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base Workshop / Home Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Door No, Street Name, Landmark"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode *</label>
                <input
                  type="text"
                  required
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Controlled Specializations */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs flex items-center justify-center font-bold">3</span>
              Specializations & Skills (Select all that apply)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SPECIALIZATION_OPTIONS.map((opt) => {
                const isSelected = selectedSpecs.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleSpec(opt.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all text-xs font-semibold ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 text-amber-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                        isSelected ? 'bg-amber-500 border-amber-600 text-slate-950' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Verification & KYC Documents */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs flex items-center justify-center font-bold">4</span>
              Verification & KYC Documents
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setIdProofUploaded(true)}
                className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer text-center transition-all ${
                  idProofUploaded ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                <UploadCloud className={`w-6 h-6 mx-auto ${idProofUploaded ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div className="text-xs font-bold text-slate-800 mt-1">Government ID Proof *</div>
                <div className="text-[10px] text-slate-500">Aadhaar Card / Voter ID / Driving License</div>
                {idProofUploaded && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> aadhaar_front_back.pdf uploaded
                  </span>
                )}
              </div>

              <div
                onClick={() => setLicenseUploaded(true)}
                className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer text-center transition-all ${
                  licenseUploaded ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                <UploadCloud className={`w-6 h-6 mx-auto ${licenseUploaded ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div className="text-xs font-bold text-slate-800 mt-1">Electrical License / Certification (Optional)</div>
                <div className="text-[10px] text-slate-500">ITI / Wireman License / Diploma Certificate</div>
                {licenseUploaded && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> wireman_license.pdf uploaded
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-md transition-all hover:scale-101 flex items-center justify-center gap-2"
          >
            <span>Submit Registration Application</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-center text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="text-amber-600 font-bold hover:underline">
              Log in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
