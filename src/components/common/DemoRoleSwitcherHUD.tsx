import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Store, Warehouse, ShieldAlert, ChevronDown, ChevronUp, RefreshCw, Sparkles, MapPin, Wrench } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { UserRole } from '../../types';

export const DemoRoleSwitcherHUD: React.FC = () => {
  const { userRole, setUserRole, currentCity, setIsLocationModalOpen, isBackendLive, services } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    services.auth.switchRoleDemo(role).catch(() => {});
    if (role === 'CUSTOMER') {
      if (!location.pathname.startsWith('/customer') && location.pathname !== '/') {
        navigate('/');
      }
    } else if (role === 'ELECTRICIAN') {
      navigate('/electrician');
    } else if (role === 'RETAILER') {
      navigate('/retailer');
    } else if (role === 'DISTRIBUTOR') {
      navigate('/distributor');
    } else if (role === 'ADMIN') {
      navigate('/admin');
    }
  };

  const handleResetData = () => {
    localStorage.removeItem('electrakart_orders');
    localStorage.removeItem('electrakart_cart');
    localStorage.removeItem('electrakart_quotations');
    window.location.reload();
  };

  const roles: { role: UserRole; label: string; sub: string; icon: React.ReactNode; color: string }[] = [
    {
      role: 'CUSTOMER',
      label: 'Customer',
      sub: 'Search, Estimate & Order',
      icon: <User className="w-3.5 h-3.5" />,
      color: 'hover:border-amber-500 text-amber-950',
    },
    {
      role: 'ELECTRICIAN',
      label: 'Electrician Portal',
      sub: 'Ramesh Kumar (Certified)',
      icon: <Wrench className="w-3.5 h-3.5" />,
      color: 'hover:border-amber-400 text-amber-950',
    },
    {
      role: 'RETAILER',
      label: 'Retailer Portal',
      sub: 'Vijayawada Electricals',
      icon: <Store className="w-3.5 h-3.5" />,
      color: 'hover:border-blue-500 text-blue-950',
    },
    {
      role: 'DISTRIBUTOR',
      label: 'Distributor Hub',
      sub: 'ABC Central Logistics',
      icon: <Warehouse className="w-3.5 h-3.5" />,
      color: 'hover:border-indigo-500 text-indigo-950',
    },
    {
      role: 'ADMIN',
      label: 'Super Admin',
      sub: 'Platform Master & KYC',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      color: 'hover:border-rose-500 text-rose-950',
    },
  ];

  return (
    <div className="no-print sticky top-0 z-50 bg-slate-950 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs">
        {/* Left: Persona & Backend status badge */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold tracking-wide uppercase transition-all duration-300"
            style={{
              borderColor: isBackendLive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.3)',
              backgroundColor: isBackendLive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: isBackendLive ? '#4ade80' : '#fbbf24',
            }}
            title={isBackendLive ? 'Connected to Fastify + PostgreSQL' : 'Fallback local state mode'}
          >
            <span className={`w-2 h-2 rounded-full ${isBackendLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span>{isBackendLive ? 'PostgreSQL Live' : 'Phase 2 Live'}</span>
          </div>

          <span className="hidden sm:inline-block text-slate-400 font-mono text-[11px]">|</span>

          {/* Quick city indicator */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="hidden sm:flex items-center gap-1 text-slate-300 hover:text-amber-400 transition-colors font-medium"
          >
            <MapPin className="w-3 h-3 text-amber-400" />
            <span>Hub: {currentCity}</span>
          </button>
        </div>

        {/* Center: Quick Persona Switcher Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          {roles.map(({ role, label, sub, icon }) => {
            const isActive = userRole === role;
            return (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold ring-2 ring-amber-400/40'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
                title={`${label} - ${sub}`}
              >
                {icon}
                <span>{label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 ml-0.5"></span>}
              </button>
            );
          })}
        </div>

        {/* Right: Reset Data & Collapse */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetData}
            title="Reset demo data to initial defaults"
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[10px]"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
