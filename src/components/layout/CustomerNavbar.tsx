import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  FileText,
  ShoppingBag,
  User,
  ChevronDown,
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  Wrench,
} from 'lucide-react';
import { ElectraKartLogo } from '../common/ElectraKartLogo';
import { NotificationBell } from '../common/NotificationBell';
import { useStore } from '../../context/StoreContext';
import { CATEGORIES_DATA } from '../../data/mockData';

export const CustomerNavbar: React.FC = () => {
  const { currentCity, pincode, setIsLocationModalOpen, cart } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const navigate = useNavigate();

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/customer/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const quickSearches = [
    { label: '6-9 switch', query: '6-9 switch' },
    { label: '2.5 wire', query: '2.5 wire' },
    { label: 'Anchor Penta', query: 'Anchor Penta' },
    { label: '1200mm fan', query: '1200mm fan' },
  ];

  return (
    <header className="sticky top-0 sm:top-[33px] z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Logo & Location */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <ElectraKartLogo size="md" />

          {/* Location Selector Pill */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 hover:bg-amber-50 hover:border-amber-300 border border-transparent transition-all text-left group"
          >
            <MapPin className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform shrink-0" />
            <div className="flex flex-col leading-none">
              <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-amber-700">
                Deliver to
              </span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                {currentCity} <span className="font-normal text-slate-500 text-[11px]">({pincode})</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
              </span>
            </div>
          </button>
        </div>

        {/* Center: Search Bar with Smart Suggestions */}
        <div className="flex-1 max-w-xl hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Try "6-9 switch", "Polycab 2.5 wire", "Anchor Penta", "1200mm fan"...'
              className="w-full pl-10 pr-24 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3 py-1 bg-slate-900 text-amber-400 hover:bg-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
            >
              Search
            </button>
          </form>

          {/* Quick search tags */}
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Popular:</span>
            {quickSearches.map((qs) => (
              <button
                key={qs.label}
                onClick={() => {
                  setSearchQuery(qs.query);
                  navigate(`/customer/search?q=${encodeURIComponent(qs.query)}`);
                }}
                className="text-slate-600 hover:text-amber-600 font-medium hover:underline"
              >
                {qs.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Categories Button */}
          <div className="relative">
            <button
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Categories</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isCategoryOpen && (
              <div
                onMouseLeave={() => setIsCategoryOpen(false)}
                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in duration-150"
              >
                <div className="p-2 border-b border-slate-100 text-xs font-bold text-slate-800">
                  Electrical Categories
                </div>
                <div className="py-1 space-y-0.5">
                  {CATEGORIES_DATA.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/customer/shop?category=${cat.slug}`}
                      onClick={() => setIsCategoryOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors"
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-slate-400">{cat.itemCount} items</span>
                    </Link>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-100">
                  <Link
                    to="/customer/shop"
                    onClick={() => setIsCategoryOpen(false)}
                    className="flex items-center justify-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                  >
                    <span>View All Catalog</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Find Electrician CTA */}
          <Link
            to="/customer/electricians"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 hover:text-amber-700 hover:bg-amber-50 rounded-xl border border-slate-200 hover:border-amber-300 transition-all"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Find Electrician</span>
            <span className="md:hidden">Electrician</span>
          </Link>

          {/* Upload Estimate Primary CTA */}
          <Link
            to="/customer/estimate"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all hover:scale-102"
          >
            <FileText className="w-4 h-4 fill-slate-950" />
            <span className="hidden xs:inline">Upload Estimate</span>
            <span className="xs:hidden">Estimate</span>
          </Link>

          {/* Orders Link */}
          <Link
            to="/customer/orders"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Package className="w-4 h-4 text-slate-500" />
            <span>Orders</span>
          </Link>

          {/* Real-time In-App Notification Bell */}
          <NotificationBell role="CUSTOMER" variant="light" />

          {/* Cart Badge */}
          <Link
            to="/customer/cart"
            className="relative flex items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
            title="View Cart"
          >
            <ShoppingBag className="w-5 h-5 text-slate-800" />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 bg-amber-500 text-slate-950 font-extrabold text-[10px] rounded-full ring-2 ring-white">
                {totalCartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Search Bar Row */}
      <div className="px-4 pb-2.5 md:hidden">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search "6-9 switch", "2.5 wire", "Anchor"...'
            className="w-full pl-9 pr-16 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <button
            type="submit"
            className="absolute right-1 top-1 px-2.5 py-1 bg-slate-900 text-amber-400 rounded-lg text-[11px] font-bold"
          >
            Go
          </button>
        </form>
      </div>
    </header>
  );
};
