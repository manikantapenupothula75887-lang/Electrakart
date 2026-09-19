import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  Warehouse,
  LayoutDashboard,
  Boxes,
  Truck,
  IndianRupee,
  Building2,
  ShieldCheck,
  ArrowRightLeft,
} from 'lucide-react';
import { ElectraKartLogo } from '../common/ElectraKartLogo';
import { DemoRoleSwitcherHUD } from '../common/DemoRoleSwitcherHUD';
import { useStore } from '../../context/StoreContext';

export const DistributorLayout: React.FC = () => {
  const { warehouses } = useStore();

  const totalUnits = warehouses.reduce((acc, w) => acc + w.totalInventoryUnits, 0);

  const navLinks = [
    { label: 'Dashboard', path: '/distributor', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
    {
      label: 'Warehouses',
      path: '/distributor/warehouses',
      icon: <Warehouse className="w-4 h-4" />,
      badge: `${warehouses.length} Active`,
    },
    { label: 'Bulk Inventory', path: '/distributor/inventory', icon: <Boxes className="w-4 h-4" /> },
    { label: 'Fulfillment & Dispatch', path: '/distributor/orders', icon: <Truck className="w-4 h-4" /> },
    { label: 'Earnings & B2B Settlements', path: '/distributor/earnings', icon: <IndianRupee className="w-4 h-4" /> },
    { label: 'Depot Profile', path: '/distributor/account', icon: <Building2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-900">
      <DemoRoleSwitcherHUD />

      {/* Distributor Header */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 sm:top-[33px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <ElectraKartLogo variant="light" size="sm" showTagline={false} />

            <div className="hidden sm:block h-6 w-px bg-slate-800"></div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold text-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white">ABC Electrical Distributors Central Hub</h2>
                  <span className="flex items-center gap-1 text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-500/30">
                    <ShieldCheck className="w-3 h-3" /> Master Distributor
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Auto Nagar Phase 2, Vijayawada • Multi-Depot Operations</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Network Stock</span>
              <span className="font-extrabold text-amber-400 font-mono">{totalUnits.toLocaleString('en-IN')} Units</span>
            </div>
          </div>
        </div>

        {/* Subnav */}
        <div className="bg-slate-900/90 border-t border-slate-800 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.path}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-800 text-amber-400 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`
                }
              >
                {link.icon}
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      <footer className="no-print bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>ElectraKart Logistics & Master Distribution Hub Console • e-Way Bill & GST Integration Gateway</p>
      </footer>
    </div>
  );
};
