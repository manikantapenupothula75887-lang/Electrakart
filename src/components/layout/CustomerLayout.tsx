import React from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerNavbar } from './CustomerNavbar';
import { MobileBottomNav } from './MobileBottomNav';
import { CustomerFooter } from './CustomerFooter';
import { LocationSelectorModal } from '../common/LocationSelectorModal';
import { ElectraAIChatModal } from '../chat/ElectraAIChatModal';
import { DemoRoleSwitcherHUD } from '../common/DemoRoleSwitcherHUD';

export const CustomerLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Interactive Demo Role HUD */}
      <DemoRoleSwitcherHUD />

      {/* Customer Header */}
      <CustomerNavbar />

      {/* Main Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <CustomerFooter />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Floating Overlays */}
      <LocationSelectorModal />
      <ElectraAIChatModal />
    </div>
  );
};
