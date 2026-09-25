import React, { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  Wrench,
  LayoutDashboard,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Power,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { ElectraKartLogo } from '../common/ElectraKartLogo';
import { DemoRoleSwitcherHUD } from '../common/DemoRoleSwitcherHUD';
import { NotificationBell } from '../common/NotificationBell';

export const ElectricianLayout: React.FC = () => {
  // Local state for UI preview (synchronized with backend in dashboard)
  const [isOnline, setIsOnline] = useState(true);
  const [verificationStatus] = useState<'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'>('APPROVED');

  const navLinks = [
    { label: 'Live Jobs & Dashboard', path: '/electrician', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
    { label: 'Job History', path: '/electrician/history', icon: <Clock className="w-4 h-4" /> },
    { label: 'Profile & Specializations', path: '/electrician/profile', icon: <UserCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-900">
      <DemoRoleSwitcherHUD />

      {/* Electrician Top Header */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 sm:top-[33px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Brand & Electrician Identity */}
          <div className="flex items-center gap-3 sm:gap-4">
            <ElectraKartLogo variant="light" size="sm" showTagline={false} />

            <div className="hidden sm:block h-6 w-px bg-slate-800"></div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100">Ramesh Kumar</span>
                  {verificationStatus === 'APPROVED' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-semibold text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-semibold text-amber-400">
                      <AlertCircle className="w-3 h-3" />
                      Pending Approval
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>Vijayawada (10 km radius)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Online Toggle & Notifications */}
          <div className="flex items-center gap-3">
            {/* Online / Offline Status Button */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              disabled={verificationStatus !== 'APPROVED'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              } ${verificationStatus !== 'APPROVED' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{isOnline ? 'Online & Ready' : 'Offline'}</span>
              <Power className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {/* Notification Bell */}
            <NotificationBell role="ELECTRICIAN" variant="dark" />

            <Link
              to="/login"
              className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Logout
            </Link>
          </div>
        </div>

        {/* Sub-Nav Links */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto border-t border-slate-800/80 scrollbar-none">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};
