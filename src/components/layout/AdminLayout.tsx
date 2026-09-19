import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Layers,
  Boxes,
  ShoppingCart,
  TrendingUp,
  Settings,
  Sparkles,
} from 'lucide-react';
import { ElectraKartLogo } from '../common/ElectraKartLogo';
import { DemoRoleSwitcherHUD } from '../common/DemoRoleSwitcherHUD';
import { useStore } from '../../context/StoreContext';

export const AdminLayout: React.FC = () => {
  const { partners, mappingQueue } = useStore();

  const pendingPartners = partners.filter((p) => p.status === 'PENDING').length;
  const pendingMappings = mappingQueue.filter((m) => m.status === 'NEEDS_ADMIN_REVIEW').length;

  const navLinks = [
    { label: 'Executive Overview', path: '/admin', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
    {
      label: 'Partners & KYC',
      path: '/admin/partners',
      icon: <Users className="w-4 h-4" />,
      badge: pendingPartners > 0 ? `${pendingPartners} New` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      label: 'Master Catalog',
      path: '/admin/products',
      icon: <Layers className="w-4 h-4" />,
      badge: pendingMappings > 0 ? `${pendingMappings} Map` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    { label: 'Network Inventory', path: '/admin/inventory', icon: <Boxes className="w-4 h-4" /> },
    { label: 'All Orders', path: '/admin/orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { label: 'Financials & Margins', path: '/admin/finance', icon: <TrendingUp className="w-4 h-4" /> },
    { label: 'Platform Settings', path: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/80 text-slate-900">
      <DemoRoleSwitcherHUD />

      {/* Admin Top Header */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 sm:top-[33px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <ElectraKartLogo variant="light" size="sm" showTagline={false} />

            <div className="hidden sm:block h-6 w-px bg-slate-800"></div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold text-xs">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white">ElectraKart Master Administration</h2>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 font-extrabold px-2 py-0.5 rounded border border-rose-500/30 uppercase tracking-wider">
                    Super Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Pan-India Marketplace Routing & Pricing Engine Console</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Fulfillment Engine Active (9 Cities)
            </span>
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
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${link.badgeColor}`}>
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
        <p>ElectraKart Corporate Administration Console • Secure Internal Access Only</p>
      </footer>
    </div>
  );
};
