import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Clock,
  Truck,
  Sparkles,
  Zap,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Search,
  Upload,
  Layers,
  Star,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CATEGORIES_DATA, BRANDS_DATA, SAMPLE_ESTIMATES } from '../../data/mockData';

export const HomePage: React.FC = () => {
  const { currentCity, pincode, setIsLocationModalOpen, products, addToCart, startEstimateAnalysis } = useStore();
  const [quickSearch, setQuickSearch] = useState('');
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/customer/search?q=${encodeURIComponent(quickSearch.trim())}`);
    }
  };

  const handleAddSample = (prod: any) => {
    addToCart(prod, 1);
    setAddedToast(prod.name);
    setTimeout(() => setAddedToast(null), 2500);
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-12">
      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Added to cart: <strong className="text-amber-300">{addedToast}</strong>
          </span>
          <Link to="/customer/cart" className="ml-2 underline font-bold text-amber-400 hover:text-white">
            View Cart
          </Link>
        </div>
      )}

      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white pt-10 pb-16 sm:py-20 border-b border-slate-800">
        {/* Subtle electrical grid background lines */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        ></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              {/* Location & Status Live Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-slate-300">
                  Active in <strong className="text-amber-400">{currentCity} ({pincode})</strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300 font-medium">18+ Local Stores & Warehouses Online</span>
              </div>

              {/* Primary Headings as per Spec */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Your Electrical Materials,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
                  One Estimate Away.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Search, estimate, compare and order electrical materials from verified stores near you.
                Upload your electrician’s bill for instant AI catalog matching and locked trade pricing.
              </p>

              {/* Primary & Secondary Action CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <Link
                  to="/customer/estimate"
                  className="flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all hover:scale-102"
                >
                  <FileText className="w-5 h-5 fill-slate-950" />
                  <span>Upload Estimate</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/customer/shop"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl border border-slate-700 transition-all hover:border-slate-500"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Shop Electricals</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 grid grid-cols-3 gap-3 border-t border-slate-800/80 text-slate-300 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>100% Genuine ISI / BIS</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>30–45 Min Rapid Dispatch</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Locked Trade Rates</span>
                </div>
              </div>
            </div>

            {/* Hero Right: Quick Estimate Dropzone Teaser */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Instant AI Estimate Scan</h3>
                      <p className="text-[11px] text-slate-400">Upload paper bill or select sample</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                    48h Price Lock
                  </span>
                </div>

                {/* Upload Teaser Area */}
                <Link
                  to="/customer/estimate"
                  className="group block border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-2xl p-6 text-center bg-slate-950/60 hover:bg-slate-950/80 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform mx-auto flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                    Click to Upload Contractor Bill / Estimate
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Supports JPG, PNG, PDF & WhatsApp photos</p>
                </Link>

                {/* Sample Bills for Instant Demo Click */}
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                    Or Try Sample Contractor Estimates:
                  </span>
                  <div className="space-y-2">
                    {SAMPLE_ESTIMATES.map((sample) => (
                      <Link
                        key={sample.id}
                        to={`/customer/estimate?sample=${sample.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-400 transition-all text-left text-xs group"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-slate-200 group-hover:text-amber-400 block truncate">
                            {sample.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {sample.extractedItemsCount} line items • {sample.electricianName.split('(')[0]}
                          </span>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                          Scan <ChevronRight className="w-3 h-3 ml-0.5" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Nearby Availability Live Ticker */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Fulfilling from 3 verified stores in {currentCity} within 30–45 mins
              </h4>
              <p className="text-xs text-slate-600">
                Vijayawada Electricals, Sri Balaji Anchor World & ABC Distribution Hub are currently dispatching.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
          >
            Change Hub ({currentCity})
          </button>
        </div>
      </div>

      {/* 3. Product Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Explore Range</span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Electrical Categories</h2>
          </div>
          <Link
            to="/customer/shop"
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {CATEGORIES_DATA.map((cat) => (
            <Link
              key={cat.id}
              to={`/customer/shop?category=${cat.slug}`}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-400 hover:shadow-md transition-all group flex flex-col justify-between h-36"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors flex items-center justify-center mb-2">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors leading-snug">
                  {cat.name}
                </h3>
                <span className="text-[11px] text-slate-500 mt-0.5 block">{cat.itemCount}+ SKUs available</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Popular Products with Nearby Availability */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">In-Demand Local Stock</span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Popular Electrical Products</h2>
          </div>
          <Link
            to="/customer/shop"
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>View Full Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.slice(0, 8).map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between group"
            >
              <Link to={`/customer/product/${product.id}`} className="block relative bg-slate-100/80 p-4 aspect-4/3 flex items-center justify-center overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="object-cover w-full h-full rounded-xl group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-slate-900/85 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                  {product.brand}
                </span>
                {product.isCertified && (
                  <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    ISI Certified
                  </span>
                )}
              </Link>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <span>{product.series}</span>
                    <span>•</span>
                    <span className="truncate">{product.configuration}</span>
                  </div>

                  <Link
                    to={`/customer/product/${product.id}`}
                    className="font-bold text-xs sm:text-sm text-slate-900 hover:text-amber-600 line-clamp-2 mt-1 transition-colors"
                  >
                    {product.name}
                  </Link>

                  {/* Distance & ETA badge */}
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>In stock nearby (2.5 km • 35 min ETA)</span>
                  </div>
                </div>

                {/* Price and Cart */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-extrabold text-slate-900 font-mono">
                        ₹{product.sellingPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-400 line-through font-mono">
                        ₹{product.mrp.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Incl. 18% GST</span>
                  </div>

                  <button
                    onClick={() => handleAddSample(product)}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 transition-colors shadow-sm"
                    title="Add to Cart"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Popular Brands Marquee */}
      <section className="bg-slate-900 text-white py-12 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Authorized Partners</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">Official Brand Dealerships</h2>
            <p className="text-xs text-slate-400 mt-1">Direct master distribution with genuine manufacturer warranties</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {BRANDS_DATA.map((brand) => (
              <div
                key={brand.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-400/60 transition-all text-center flex flex-col items-center justify-center h-24 group"
              >
                <span className="font-black text-base sm:text-lg tracking-wider text-slate-200 group-hover:text-amber-400 font-mono transition-colors">
                  {brand.logoText}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-medium truncate max-w-full">
                  {brand.series.slice(0, 2).join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. How ElectraKart Works (Workflow Diagram) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">The Technology Engine</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">From Estimate to Delivery</h2>
          <p className="text-xs text-slate-600 mt-1.5">How our multi-tier marketplace fulfills complex electrical bills</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-base">
              1
            </div>
            <h3 className="font-bold text-sm text-slate-900">Upload / Search Estimate</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Customer submits electrician's bill or searches shorthand queries like "6-9 switch".
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-extrabold text-base">
              2
            </div>
            <h3 className="font-bold text-sm text-slate-900">ElectraAI Disambiguation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI normalizes handwriting, maps brands & series, and clarifies ambiguous configurations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-extrabold text-base">
              3
            </div>
            <h3 className="font-bold text-sm text-slate-900">Nearby Stock & Price Lock</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inventory engine scans eligible stores in your city and generates a 48h locked quotation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-base">
              4
            </div>
            <h3 className="font-bold text-sm text-slate-900">Smart Split Delivery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Retailers & distributor depots pack and dispatch in parallel with unified OTP tracking.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Electrician & Contractor Testimonials */}
      <section className="bg-slate-100 py-12 rounded-3xl max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Field Proven</span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Trusted by 1,200+ Electricians & Builders</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500" />
              ))}
            </div>
            <p className="text-xs text-slate-700 italic leading-relaxed">
              "Earlier, I used to send my client with a paper bill to 3 different shops in Besant Road. With ElectraKart, I just snap the bill and all Polycab wires and Anchor switches reach the site within 45 minutes."
            </p>
            <div>
              <h4 className="font-bold text-xs text-slate-900">K. Ramana Rao</h4>
              <p className="text-[11px] text-slate-500">Licensed Electrical Contractor, Vijayawada</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500" />
              ))}
            </div>
            <p className="text-xs text-slate-700 italic leading-relaxed">
              "The 48-hour locked quotation feature is a lifesaver for our construction estimates. Copper prices fluctuate constantly, but ElectraKart guarantees our rate once quotation is generated."
            </p>
            <div>
              <h4 className="font-bold text-xs text-slate-900">Ch. Venkatesh</h4>
              <p className="text-[11px] text-slate-500">Managing Director, Sri Sai Constructions, Guntur</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500" />
              ))}
            </div>
            <p className="text-xs text-slate-700 italic leading-relaxed">
              "The smart search clarification helped me avoid ordering wrong switch modules for our duplex renovation. You select 6-module and it automatically filters Legrand Arteor plates and compatible 16A sockets."
            </p>
            <div>
              <h4 className="font-bold text-xs text-slate-900">Dr. S. Lavanya</h4>
              <p className="text-[11px] text-slate-500">Homeowner, Benz Circle, Vijayawada</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
