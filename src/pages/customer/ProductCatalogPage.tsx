import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Filter,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  ShoppingBag,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CATEGORIES_DATA, BRANDS_DATA } from '../../data/mockData';

export const ProductCatalogPage: React.FC = () => {
  const { products, addToCart, currentCity } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const brandParam = searchParams.get('brand');

  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || 'ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>(brandParam || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'POPULAR' | 'PRICE_LOW' | 'PRICE_HIGH' | 'RATING'>('POPULAR');
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCategory =
          selectedCategory === 'ALL' ||
          p.category.toLowerCase().replace(/[^a-z0-9]/g, '-') === selectedCategory ||
          p.category === selectedCategory;

        const matchesBrand =
          selectedBrand === 'ALL' || p.brand.toLowerCase() === selectedBrand.toLowerCase();

        const matchesQuery =
          !searchQuery.trim() ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCategory && matchesBrand && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === 'PRICE_LOW') return a.sellingPrice - b.sellingPrice;
        if (sortBy === 'PRICE_HIGH') return b.sellingPrice - a.sellingPrice;
        if (sortBy === 'RATING') return b.rating - a.rating;
        return b.reviewCount - a.reviewCount;
      });
  }, [products, selectedCategory, selectedBrand, searchQuery, sortBy]);

  const handleAdd = (prod: any) => {
    addToCart(prod, 1);
    setAddedToast(prod.name);
    setTimeout(() => setAddedToast(null), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Toast Alert */}
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

      {/* Catalog Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Verified Electrical Stock • Hub: {currentCity}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Browse Master Electrical Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing {filteredProducts.length} verified products with real-time nearby stock
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search filter input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, spec, SKU..."
              className="pl-8 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 w-48 sm:w-60"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-700"
          >
            <option value="POPULAR">Sort: Most Popular</option>
            <option value="PRICE_LOW">Price: Low to High</option>
            <option value="PRICE_HIGH">Price: High to Low</option>
            <option value="RATING">Highest Customer Rating</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-6">
          {/* Category Filter List */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Categories</span>
              {selectedCategory !== 'ALL' && (
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className="text-[10px] text-amber-600 font-bold hover:underline"
                >
                  Clear
                </button>
              )}
            </h3>

            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                  selectedCategory === 'ALL'
                    ? 'bg-amber-50 text-amber-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>All Categories</span>
                <span className="text-[10px] text-slate-400">{products.length}</span>
              </button>

              {CATEGORIES_DATA.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                    selectedCategory === cat.name
                      ? 'bg-amber-50 text-amber-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate pr-2">{cat.name}</span>
                  <span className="text-[10px] text-slate-400">{cat.itemCount}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Brands</span>
              {selectedBrand !== 'ALL' && (
                <button
                  onClick={() => setSelectedBrand('ALL')}
                  className="text-[10px] text-amber-600 font-bold hover:underline"
                >
                  Clear
                </button>
              )}
            </h3>

            <div className="space-y-1">
              <button
                onClick={() => setSelectedBrand('ALL')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  selectedBrand === 'ALL' ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Brands
              </button>

              {BRANDS_DATA.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => setSelectedBrand(brand.name)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                    selectedBrand.toLowerCase() === brand.name.toLowerCase()
                      ? 'bg-amber-50 text-amber-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{brand.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
              <Search className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800">No matching products found</h3>
              <p className="text-xs text-slate-500">Try changing your search query or reset category filters.</p>
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSelectedBrand('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between group"
                >
                  <Link
                    to={`/customer/product/${product.id}`}
                    className="block relative bg-slate-100/80 p-4 aspect-4/3 flex items-center justify-center overflow-hidden"
                  >
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
                        ISI IS 694
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

                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>In stock nearby (2.5 km • 35 min ETA)</span>
                      </div>
                    </div>

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
                        <span className="text-[10px] text-slate-500 block">Unit: {product.unit}</span>
                      </div>

                      <button
                        onClick={() => handleAdd(product)}
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
          )}
        </div>
      </div>
    </div>
  );
};
