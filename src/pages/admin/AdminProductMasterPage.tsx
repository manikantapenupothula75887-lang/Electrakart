import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  ArrowRight,
  ShieldCheck,
  Edit,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';

export const AdminProductMasterPage: React.FC = () => {
  const { products, addMasterProduct, mappingQueue, resolveMappingQueueItem } = useStore();
  const [activeTab, setActiveTab] = useState<'catalog' | 'mapping' | 'add'>('catalog');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // New product form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('Polycab');
  const [series, setSeries] = useState('FlameX FR');
  const [category, setCategory] = useState('Wires & Cables');
  const [mrp, setMrp] = useState(3500);
  const [sellingPrice, setSellingPrice] = useState(2850);
  const [config, setConfig] = useState('2.5 sq.mm');
  const [spec, setSpec] = useState('Single Core 1100V Pure Copper');
  const [unit, setUnit] = useState('Coil (90m)');

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    addMasterProduct({
      sku: sku.toUpperCase(),
      name,
      category,
      productType: 'Master Catalog Standard',
      brand,
      series,
      model: `${series} ${config}`,
      configuration: config,
      specification: spec,
      mrp: Number(mrp),
      sellingPrice: Number(sellingPrice),
      hsnCode: '8544',
      gstPercent: 18,
      unit,
      isCertified: true,
      certificationNumber: 'IS 694 : 2010',
      warranty: '5 Years Manufacturer Warranty',
      description: `${name} standard electrical specification.`,
      specs: {
        'Brand Origin': brand,
        Standard: 'IS 694 / IS 3854',
      },
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
      inStockTotal: 50,
      rating: 5.0,
      reviewCount: 1,
    });

    setToast(`Master SKU ${sku.toUpperCase()} published to nationwide catalog!`);
    setActiveTab('catalog');
    setTimeout(() => setToast(null), 3000);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-8">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Canonical Taxonomy Master
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Product Master & Partner Catalog Mapping
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Category → Product Type → Brand → Series → Model → Configuration → Specification → Exact SKU
          </p>
        </div>

        <button
          onClick={() => setActiveTab('add')}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Create New Master SKU</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'catalog' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Master Catalog ({products.length} SKUs)
        </button>
        <button
          onClick={() => setActiveTab('mapping')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'mapping' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Pending Mapping Review</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
            {mappingQueue.length}
          </span>
        </button>
        {activeTab === 'add' && (
          <button className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950">
            Create Master SKU
          </button>
        )}
      </div>

      {/* TAB 1: MASTER CATALOG HIERARCHY */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Master SKU, brand, model..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredProducts.length} certified SKUs
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider font-mono">
                    <th className="py-3 px-4">Master SKU</th>
                    <th className="py-3 px-3">Product Name</th>
                    <th className="py-3 px-3">Brand & Series</th>
                    <th className="py-3 px-3">Configuration</th>
                    <th className="py-3 px-3 text-right">MRP (₹)</th>
                    <th className="py-3 px-3 text-right">Selling Ref (₹)</th>
                    <th className="py-3 px-3 text-center">ISI Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredProducts.map((p) => (
                    <tr key={p.sku} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.sku}</td>
                      <td className="py-3 px-3 font-sans font-semibold text-slate-800">{p.name}</td>
                      <td className="py-3 px-3 font-sans text-slate-600">
                        {p.brand} ({p.series})
                      </td>
                      <td className="py-3 px-3 text-slate-500">{p.configuration}</td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        ₹{p.mrp.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ₹{p.sellingPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px]">
                          IS 694
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARTNER CATALOG MAPPING QUEUE (Prompt Requirement) */}
      {activeTab === 'mapping' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div>
              <span className="font-bold block">Partner Ingestion Mapping Engine:</span>
              <span className="text-amber-800">
                When retailers bulk-upload Tally/Excel terms (e.g. "Anchor 6M switch"), fuzzy AI correlates
                them with the Master SKU. Items below 85% confidence are routed here for Super Admin approval.
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {mappingQueue.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                      Raw Term: "{item.rawTerm}"
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                        item.status === 'MATCHED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Uploaded by: <strong>{item.retailerName}</strong> • Submitted: {item.submittedAt}
                  </div>
                  <div className="text-slate-800 font-semibold pt-1">
                    AI Suggested SKU: <span className="font-mono text-amber-600 font-bold">{item.suggestedSku}</span> ({item.suggestedName})
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 mr-2">
                    Confidence: {(item.confidenceScore * 100).toFixed(0)}%
                  </span>

                  {item.status !== 'APPROVED' && (
                    <button
                      onClick={() => {
                        resolveMappingQueueItem(item.id, 'APPROVED');
                        setToast(`Mapping for "${item.rawTerm}" approved & linked to ${item.suggestedSku}!`);
                        setTimeout(() => setToast(null), 3000);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
                    >
                      Approve Match
                    </button>
                  )}

                  <button
                    onClick={() => {
                      resolveMappingQueueItem(item.id, 'REJECTED');
                      setToast(`Mapping rejected. Retailer prompted for manual revision.`);
                      setTimeout(() => setToast(null), 3000);
                    }}
                    className="px-3 py-2 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ADD MASTER PRODUCT / SKU FORM */}
      {activeTab === 'add' && (
        <form onSubmit={handleCreateProduct} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 text-xs max-w-2xl">
          <h3 className="font-extrabold text-base text-slate-900">Define Master Product & Canonical SKU</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Official Product Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Polycab FlameX FR 4.0 sq.mm Copper Wire Red"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Generated Master SKU</label>
              <input
                type="text"
                required
                placeholder="e.g. POL-WX-40-RED-90M"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border rounded-xl font-mono uppercase"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl"
              >
                <option>Wires & Cables</option>
                <option>Switches & Sockets</option>
                <option>Fans</option>
                <option>Lighting</option>
                <option>MCBs & Protection</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Brand</label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Series</label>
              <input
                type="text"
                required
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">MRP (₹)</label>
              <input
                type="number"
                value={mrp}
                onChange={(e) => setMrp(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Selling Price (₹)</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800"
            >
              Save Master SKU
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
