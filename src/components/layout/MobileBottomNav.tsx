import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, FileText, Package, User } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const MobileBottomNav: React.FC = () => {
  const { cart } = useStore();
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { label: 'Home', path: '/', icon: <Home className="w-5 h-5" /> },
    { label: 'Shop', path: '/customer/shop', icon: <ShoppingBag className="w-5 h-5" /> },
    {
      label: 'Estimate',
      path: '/customer/estimate',
      icon: <FileText className="w-5 h-5" />,
      isHighlight: true,
    },
    {
      label: 'Orders',
      path: '/customer/orders',
      icon: <Package className="w-5 h-5" />,
    },
    { label: 'Account', path: '/customer/account', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav className="no-print sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 py-1.5 shadow-lg flex items-center justify-around">
      {navItems.map((item) => {
        if (item.isHighlight) {
          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center -mt-5 transition-transform active:scale-95 ${
                  isActive ? 'text-amber-600' : 'text-slate-700'
                }`
              }
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-4 ring-white">
                <FileText className="w-5 h-5 fill-slate-950" />
              </div>
              <span className="text-[10px] font-extrabold mt-1 text-slate-900 tracking-tight">Estimate</span>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 rounded-lg transition-colors relative ${
                isActive ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {item.icon}
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
