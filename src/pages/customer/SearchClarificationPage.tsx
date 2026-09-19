import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Layers,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';

export const SearchClarificationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawQuery = searchParams.get('q') || '6-9 switch';
  const { products, addToCart } = useStore();
  const navigate = useNavigate();

  // Multi-step clarification states
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);

  // Exact matched product
  const [matchedSkuProduct, setMatchedSkuProduct] = useState<Product | null>(null);

  // Reset steps on query change
  useEffect(() => {
    setSelectedBrand(null);
    setSelectedSeries(null);
    setSelectedConfig(null);
    setSelectedSpec(null);
    setMatchedSkuProduct(null);

    // If query matches a single exact product directly (e.g. "Polycab 2.5 wire" or exact SKU)
    const qLower = rawQuery.toLowerCase().trim();
    if (qLower.includes('polycab') && qLower.includes('2.5')) {
      const p = products.find((it) => it.sku === 'POL-WX-25-RED-90M');
      if (p) setMatchedSkuProduct(p);
    } else if (qLower.includes('havells') && (qLower.includes('fan') || qLower.includes('1200'))) {
      const p = products.find((it) => it.sku === 'HAV-STL-1200-BLU');
      if (p) setMatchedSkuProduct(p);
    } else if (qLower.includes('penta')) {
      setSelectedBrand('Anchor');
      setSelectedSeries('Penta');
    }
  }, [rawQuery, products]);

  // Brand choices for the clarification engine
  const availableBrands = ['Anchor', 'Legrand', 'Havells', 'GM', 'Schneider', 'GreatWhite'];

  // Series choices based on selected brand
  const getSeriesForBrand = (brand: string) => {
    switch (brand) {
      case 'Anchor':
        return ['Roma Classic', 'Penta', 'Zivo'];
      case 'Legrand':
        return ['Arteor', 'Mylinc', 'Britzy'];
      case 'Schneider':
        return ['Opale', 'Livia', 'Acti9'];
      case 'GM':
        return ['G-X Modular', 'Four Five', 'Zenova'];
      case 'Havells':
        return ['Crabtree Verona', 'Stealth Air', 'Euroload'];
      default:
        return ['Standard Modular', 'Classic Series'];
    }
  };

  // Configurations
  const availableConfigs = ['6 Module', '8 Module', '9 Module', 'Single Switch'];

  // Specifications
  const availableSpecs = [
    { label: '6A 1-Way Switch', code: '6A-1W' },
    { label: '16A Power Switch', code: '16A-1W' },
    { label: '16A Shuttered Socket', code: '16A-SKT' },
    { label: 'Step Fan Regulator', code: 'REG' },
    { label: '2-Way Staircase Switch', code: '2W' },
    { label: 'Cover Plate with Frame', code: 'PLT' },
  ];

  // Resolve matching product when selections are made
  const handleSpecSelect = (specLabel: string) => {
    setSelectedSpec(specLabel);

    // Map to realistic SKU
    if (selectedBrand === 'Anchor') {
      if (selectedSeries === 'Penta') {
        const prod = products.find((p) => p.sku === 'ANC-PEN-6A1W-WHT') || products[4];
        setMatchedSkuProduct(prod);
      } else if (selectedConfig === '6 Module' || specLabel.includes('Cover Plate')) {
        const prod = products.find((p) => p.sku === 'ANC-ROM-6M-PLT-WHT') || products[5];
        setMatchedSkuProduct(prod);
      } else if (selectedConfig === '8 Module') {
        const prod = products.find((p) => p.sku === 'ANC-ROM-8M-PLT-WHT') || products[7];
        setMatchedSkuProduct(prod);
      } else if (selectedConfig === '9 Module') {
        const prod = products.find((p) => p.sku === 'ANC-ROM-9M-PLT-WHT') || products[8];
        setMatchedSkuProduct(prod);
      } else {
        const prod = products.find((p) => p.sku === 'ANC-ROM-6A1W-WHT') || products[6];
        setMatchedSkuProduct(prod);
      }
    } else if (selectedBrand === 'Legrand') {
      const prod = products.find((p) => p.sku === 'LEG-ART-16AS-MG') || products[9];
      setMatchedSkuProduct(prod);
    } else if (selectedBrand === 'Schneider') {
      const prod = products.find((p) => p.sku === 'SCH-ACT-16A-SP') || products[10];
      setMatchedSkuProduct(prod);
    } else {
      setMatchedSkuProduct(products[5]);
    }
  };

  const handleResetFilters = () => {
    setSelectedBrand(null);
    setSelectedSeries(null);
    setSelectedConfig(null);
    setSelectedSpec(null);
    setMatchedSkuProduct(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Search Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Smart Electrical Disambiguation Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Search Results for <span className="text-amber-400 font-mono">"{rawQuery}"</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl">
              In Indian electrical trade, terms like <em>"6-9 switch"</em> require specifying Brand, Series,
              Configuration, and Module rating to prevent shipping incorrect materials.
            </p>
          </div>

          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold self-start sm:self-center transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Selections</span>
          </button>
        </div>

        {/* Interactive Breadcrumb Flow */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
          <span className="font-bold text-slate-400 uppercase text-[10px]">Hierarchy:</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium">Category: Switches</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          <span
            className={`px-2.5 py-1 rounded-lg font-bold ${
              selectedBrand ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-500'
            }`}
          >
            Brand: {selectedBrand || 'Select Below'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          <span
            className={`px-2.5 py-1 rounded-lg font-bold ${
              selectedSeries ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-500'
            }`}
          >
            Series: {selectedSeries || 'Pending'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          <span
            className={`px-2.5 py-1 rounded-lg font-bold ${
              selectedConfig ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-500'
            }`}
          >
            Config: {selectedConfig || 'Pending'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          <span
            className={`px-2.5 py-1 rounded-lg font-bold ${
              selectedSpec ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
            }`}
          >
            Spec: {selectedSpec || 'Pending'}
          </span>
        </div>
      </div>

      {/* Clarification Stepper UI */}
      {!matchedSkuProduct ? (
        <div className="space-y-6">
          {/* STEP 1: Select Brand */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>Select Brand:</span>
              </h3>
              {selectedBrand && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {availableBrands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => {
                    setSelectedBrand(brand);
                    setSelectedSeries(null);
                    setSelectedConfig(null);
                    setSelectedSpec(null);
                  }}
                  className={`p-3.5 rounded-xl text-center border font-bold text-xs transition-all ${
                    selectedBrand === brand
                      ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-400/40'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2: Select Series (Unlocks after Brand) */}
          {selectedBrand && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  <span>Select Series for {selectedBrand}:</span>
                </h3>
                {selectedSeries && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {getSeriesForBrand(selectedBrand).map((series) => (
                  <button
                    key={series}
                    onClick={() => {
                      setSelectedSeries(series);
                      setSelectedConfig(null);
                      setSelectedSpec(null);
                    }}
                    className={`p-4 rounded-xl text-left border transition-all ${
                      selectedSeries === series
                        ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-400/40'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-extrabold text-xs block text-slate-900">{series}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {series.includes('Penta')
                        ? 'Standard non-modular piano switch'
                        : 'High-gloss modular polycarbonate plate & switches'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Select Configuration (Unlocks after Series) */}
          {selectedSeries && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                    3
                  </span>
                  <span>Select Configuration:</span>
                </h3>
                {selectedConfig && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {availableConfigs.map((cfg) => (
                  <button
                    key={cfg}
                    onClick={() => {
                      setSelectedConfig(cfg);
                      setSelectedSpec(null);
                    }}
                    className={`p-3.5 rounded-xl text-center border font-bold text-xs transition-all ${
                      selectedConfig === cfg
                        ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-400/40'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    {cfg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Select Specifications (Final Step) */}
          {selectedConfig && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                    4
                  </span>
                  <span>Select Specification (Pinpoints Exact SKU):</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableSpecs.map((spec) => (
                  <button
                    key={spec.label}
                    onClick={() => handleSpecSelect(spec.label)}
                    className="p-3.5 rounded-xl text-left border bg-slate-50/70 hover:bg-amber-50 border-slate-200 hover:border-amber-400 text-slate-900 transition-all font-semibold text-xs flex items-center justify-between group"
                  >
                    <span>{spec.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* EXACT SKU MATCH RESULT */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-400/60 shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                ✓
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                  Clarification Complete • Exact SKU Pinpointed
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {matchedSkuProduct.name}
                </h2>
              </div>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
            >
              Change Parameters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 bg-slate-100 rounded-2xl p-4 aspect-4/3 flex items-center justify-center overflow-hidden">
              <img
                src={matchedSkuProduct.imageUrl}
                alt={matchedSkuProduct.name}
                className="object-cover w-full h-full rounded-xl"
              />
            </div>

            <div className="md:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-slate-900 text-white text-xs font-mono font-bold px-2.5 py-1 rounded-md">
                  SKU: {matchedSkuProduct.sku}
                </span>
                <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-md">
                  {matchedSkuProduct.brand} {matchedSkuProduct.series}
                </span>
                <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> ISI Marked
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{matchedSkuProduct.description}</p>

              {/* Nearby Store Stock Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">In Stock Nearby (Vijayawada Electricals)</span>
                    <span className="text-[11px] text-slate-500 block">2.5 km away • 30–45 min delivery</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  14 units available
                </span>
              </div>

              {/* Pricing and CTAs */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      ₹{matchedSkuProduct.sellingPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm text-slate-400 line-through font-mono">
                      ₹{matchedSkuProduct.mrp.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      Save ₹{(matchedSkuProduct.mrp - matchedSkuProduct.sellingPrice).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">Unit: {matchedSkuProduct.unit} (Incl. 18% GST)</span>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    to={`/customer/product/${matchedSkuProduct.id}`}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                  >
                    View Technical Specs
                  </Link>

                  <button
                    onClick={() => {
                      addToCart(matchedSkuProduct, 1);
                      navigate('/customer/cart');
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart & Order</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
