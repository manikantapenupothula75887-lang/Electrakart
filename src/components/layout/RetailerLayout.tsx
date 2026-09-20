import React, { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  Store,
  LayoutDashboard,
  Package,
  ShoppingCart,
  IndianRupee,
  UserCheck,
  Bell,
  CheckCircle2,
  UploadCloud,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { ElectraKartLogo } from '../common/ElectraKartLogo';
import { DemoRoleSwitcherHUD } from '../common/DemoRoleSwitcherHUD';
import { NotificationBell } from '../common/NotificationBell';
import { useStore } from '../../context/StoreContext';

export const RetailerLayout: React.FC = () => {
  const { currentCity, orders, retailerInventory } = useStore();
  const [isOnline, setIsOnline] = useState(true);

  // Calculate pending incoming orders for retailer
  const pendingOrdersCount = orders.filter((o) =>
    o.fulfillments.some((f) => f.partnerId === 'partner-vja-elec-1' && f.status !== 'DELIVERED')
  ).length;

  const lowStockCount = retailerInventory.filter((i) => i.available <= i.lowStockThreshold).length;

  const navLinks = [
    { label: 'Dashboard', path: '/retailer', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
    {
      label: 'Inventory',
      path: '/retailer/inventory',
      icon: <Package className="w-4 h-4" />,
      badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      label: 'Orders',
      path: '/retailer/orders',
      icon: <ShoppingCart className="w-4 h-4" />,
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} Active` : undefined,
      badgeColor: 'bg-blue-100 text-blue-800 font-bold',
    },
    { label: 'Earnings & Settlement', path: '/retailer/earnings', icon: <IndianRupee className="w-4 h-4" /> },
    { label: 'Store Account', path: '/retailer/account', icon: <UserCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-900">
      <DemoRoleSwitcherHUD />

      {/* Retailer Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 sm:top-[33px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Brand & Partner Store Identity */}
          <div className="flex items-center gap-3 sm:gap-4">
            <ElectraKartLogo variant="light" size="sm" showTagline={false} />

            <div className="hidden sm:block h-6 w-px bg-slate-800"></div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xs">
                <Store className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white">Vijayawada Electricals & Hardware</h2>
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Verified Dealer
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Besant Road, {currentCity} • GSTIN: 37AAAAA1234A1Z5</p>
              </div>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-3">
            {/* Online/Offline Toggle */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                isOnline
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              <span>{isOnline ? 'Store Accepting Orders' : 'Store Offline'}</span>
            </button>

            <Link
              to="/retailer/inventory?tab=bulk"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Bulk Stock Upload</span>
            </Link>

            {/* Notification Bell */}
            <NotificationBell role="RETAILER" variant="dark" />
          </div>
        </div>

        {/* Secondary Subnav Bar */}
        <div className="bg-slate-950/90 border-t border-slate-800 px-4 sm:px-6">
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
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      {/* Retailer Footer */}
      <footer className="no-print bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>ElectraKart Retailer Merchant Console • Dedicated Partner Support: 1800-209-8844</p>
      </footer>
    </div>
  );
};
