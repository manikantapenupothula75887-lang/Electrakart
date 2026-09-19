import React, { useState } from 'react';
import { MapPin, Navigation, Check, X, ShieldCheck, Store, Building2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CITIES_DATA } from '../../data/mockData';

export const LocationSelectorModal: React.FC = () => {
  const { currentCity, setCurrentCity, pincode, setPincode, isLocationModalOpen, setIsLocationModalOpen } = useStore();
  const [customPin, setCustomPin] = useState(pincode);
  const [detecting, setDetecting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isLocationModalOpen) return null;

  const handleSelectCity = (city: string, defaultPin: string) => {
    setCurrentCity(city);
    setPincode(defaultPin + '001');
    setCustomPin(defaultPin + '001');
    setSuccessMsg(`Location set to ${city} (${defaultPin}001). Eligible stores synced!`);
    setTimeout(() => {
      setSuccessMsg('');
      setIsLocationModalOpen(false);
    }, 1000);
  };

  const handleDetectGPS = () => {
    setDetecting(true);
    setTimeout(() => {
      setDetecting(false);
      setCurrentCity('Vijayawada');
      setPincode('520002');
      setCustomPin('520002');
      setSuccessMsg('GPS Detected: Governorpet, Vijayawada - 520002');
      setTimeout(() => {
        setSuccessMsg('');
        setIsLocationModalOpen(false);
      }, 1200);
    }, 900);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPin.length === 6) {
      setPincode(customPin);
      setSuccessMsg(`Pincode ${customPin} updated successfully!`);
      setTimeout(() => {
        setSuccessMsg('');
        setIsLocationModalOpen(false);
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Select Your Delivery Hub</h3>
              <p className="text-xs text-slate-300">Nearest stores & inventory will auto-align</p>
            </div>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Success Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* GPS Quick Detect Button */}
          <button
            onClick={handleDetectGPS}
            disabled={detecting}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 transition-colors group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Navigation className={`w-4 h-4 ${detecting ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <span className="font-semibold text-sm text-slate-900 block">
                  {detecting ? 'Detecting Nearest Coordinates...' : 'Detect My Exact Location'}
                </span>
                <span className="text-xs text-slate-600">Using browser GPS to match verified local dealers</span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">Auto</span>
          </button>

          {/* Pincode Input Form */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Or Enter 6-Digit Delivery Pincode
            </label>
            <form onSubmit={handlePinSubmit} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={customPin}
                onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 520002"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800 tracking-wider text-sm"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 text-white font-semibold text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
              >
                Apply Pin
              </button>
            </form>
          </div>

          {/* Popular Cities Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Select City / Fulfillment Hub
              </span>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> 9 Active Hubs
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {CITIES_DATA.map((city) => {
                const isCurrent = currentCity.toLowerCase() === city.name.toLowerCase();
                return (
                  <button
                    key={city.id}
                    onClick={() => handleSelectCity(city.name, city.pincodePrefix)}
                    className={`p-3 rounded-xl text-left border transition-all text-xs flex flex-col justify-between h-20 ${
                      isCurrent
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-1 ring-amber-500'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className={`font-bold ${isCurrent ? 'text-amber-900' : 'text-slate-800'}`}>
                        {city.name}
                      </span>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {city.state}
                      <span className="block text-[10px] text-slate-400 font-mono">Pin: {city.pincodePrefix}xxx</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intelligent Routing Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <Store className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-800 font-medium">Smart Dispatch: </strong>
              ElectraKart automatically routes each line item to the closest authorized dealer or regional master distributor to ensure 30–60 min delivery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
