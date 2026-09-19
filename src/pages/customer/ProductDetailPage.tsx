import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  MapPin,
  Store,
  Truck,
  CheckCircle2,
  ChevronRight,
  ShoppingBag,
  Zap,
  Star,
  Plus,
  Minus,
  Award,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { NearbyStoreStock } from '../../types';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getProductById, getNearbyStockForProduct, addToCart, currentCity } = useStore();
  const navigate = useNavigate();

  const product = getProductById(id || '') || useStore().products[0];
  const nearbyStores = getNearbyStockForProduct(product.id);

  const [quantity, setQuantity] = useState(1);
  const [selectedStore, setSelectedStore] = useState<NearbyStoreStock>(nearbyStores[0]);
  const [addedToast, setAddedToast] = useState(false);

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedStore);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedStore);
    navigate('/customer/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Toast Alert */}
      {addedToast && (
        <div className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Added {quantity} × <strong className="text-amber-300">{product.name}</strong>
          </span>
          <Link to="/customer/cart" className="ml-2 underline font-bold text-amber-400 hover:text-white">
            Go to Cart
          </Link>
        </div>
      )}

      {/* Breadcrumb Hierarchy */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto scrollbar-none">
        <Link to="/" className="hover:text-slate-800">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <Link to={`/customer/shop?category=${product.category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`} className="hover:text-slate-800">
          {product.category}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-700 font-medium">{product.brand}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-900 font-bold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Product Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Product Image & Certifications */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative overflow-hidden flex items-center justify-center aspect-4/3">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="object-cover w-full h-full rounded-2xl"
            />
            {product.isCertified && (
              <div className="absolute top-4 right-4 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>BIS / ISI Verified</span>
              </div>
            )}
          </div>

          {/* Genuine Stamp Guarantee */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 flex items-center gap-3">
            <Award className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold block">100% Genuine Certified Stock</span>
              <span className="text-amber-800 text-[11px]">
                {product.certificationNumber} • Includes manufacturer tamper-proof holographic seal
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Product Details, SKU, Selling Price & Purchase */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-slate-900 text-amber-400 font-mono text-xs font-bold px-2.5 py-0.5 rounded">
                SKU: {product.sku}
              </span>
              <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                {product.brand}
              </span>
              <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                {product.series}
              </span>
              <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                HSN {product.hsnCode}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 mt-2 text-xs">
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-4 h-4 fill-amber-500" />
                <span>{product.rating}</span>
              </div>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">{product.reviewCount} verified contractor ratings</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-700 font-bold">In Stock ({product.inStockTotal} total units)</span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900 font-mono">
                ₹{selectedStore.price.toLocaleString('en-IN')}
              </span>
              <span className="text-sm text-slate-400 line-through font-mono">
                ₹{product.mrp.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Save ₹{(product.mrp - selectedStore.price).toLocaleString('en-IN')} (Wholesale Rate)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Unit: <strong>{product.unit}</strong> • Net Price includes 18% GST (Tax Invoice provided with serial numbers)
            </p>
          </div>

          {/* NEARBY INVENTORY SECTION (Strict Requirement) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4 text-amber-500" />
                <span>Available At Nearby Stores ({currentCity} Region):</span>
              </h3>
              <span className="text-[11px] text-slate-500">Auto-routes to closest partner</span>
            </div>

            <div className="space-y-2.5">
              {nearbyStores.map((st, idx) => {
                const isSelected = selectedStore.partnerId === st.partnerId;
                return (
                  <button
                    key={st.partnerId}
                    type="button"
                    onClick={() => setSelectedStore(st)}
                    className={`w-full p-4 rounded-2xl text-left border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 shadow-xs ring-1 ring-amber-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{st.storeName}</span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {st.partnerType}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.2 rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{st.address}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 block">
                          <strong>{st.distanceKm} km</strong> away
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" /> ETA {st.deliveryEtaMin} mins
                        </span>
                      </div>

                      <div className="text-right border-l border-slate-200 pl-3">
                        <span className="font-mono font-bold text-slate-900 text-sm block">
                          ₹{st.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {st.stockCount} in stock
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector & Action CTAs */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-700">Quantity ({product.unit}):</span>
              <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-1 text-sm font-bold font-mono text-slate-900 min-w-10 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Add to Cart</span>
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-md transition-all hover:scale-102"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Buy Now (Express Dispatch)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Specifications Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-extrabold text-slate-900">Technical Specifications & Engineering Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
          {Object.entries(product.specs).map(([key, value]) => (
            <div key={key} className="flex items-baseline justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">{key}</span>
              <span className="text-slate-900 font-bold font-mono text-right">{value}</span>
            </div>
          ))}
          <div className="flex items-baseline justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Warranty</span>
            <span className="text-slate-900 font-bold font-mono text-right">{product.warranty}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
