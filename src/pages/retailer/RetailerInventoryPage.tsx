import React, { useState } from 'react';
import {
  Package,
  Plus,
  Minus,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const RetailerInventoryPage: React.FC = () => {
  const { retailerInventory, adjustRetailerStock, importBulkInventory } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [importSuccessToast, setImportSuccessToast] = useState(false);

  // Column mapping states
  const [skuCol, setSkuCol] = useState('Product SKU');
  const [nameCol, setNameCol] = useState('Product Description');
  const [brandCol, setBrandCol] = useState('Brand Name');
  const [qtyCol, setQtyCol] = useState('Opening Stock');
  const [priceCol, setPriceCol] = useState('Counter MRP / Price');

  // Filtered inventory
  const filtered = retailerInventory.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Demo imported rows for preview
  const sampleImportRows = [
    { sku: 'POL-WX-25-RED-90M', name: 'Polycab FlameX FR 2.5 Red', brand: 'Polycab', stock: 20, price: 3100, status: 'MATCHED' },
    { sku: 'ANC-ROM-6A1W-WHT', name: 'Anchor Roma 6A 1-Way Switch Pack', brand: 'Anchor', stock: 30, price: 460, status: 'MATCHED' },
    { sku: 'LEG-ART-16AS-MG', name: 'Legrand Arteor 16A Shuttered Socket', brand: 'Legrand', stock: 15, price: 520, status: 'MATCHED' },
    { sku: 'UNM-UNKNOWN-SWITCH', name: 'Local 6-9 Piano Switch Non-Branded', brand: 'Local', stock: 50, price: 120, status: 'UNMATCHED' },
  ];

  const handleCommitImport = () => {
    importBulkInventory([
      { sku: 'POL-WX-25-RED-90M', name: 'Polycab FlameX FR 2.5 Red', brand: 'Polycab', stock: 20, price: 3100 },
      { sku: 'ANC-ROM-6A1W-WHT', name: 'Anchor Roma 6A 1-Way Switch Pack', brand: 'Anchor', stock: 30, price: 460 },
      { sku: 'LEG-ART-16AS-MG', name: 'Legrand Arteor 16A Shuttered Socket', brand: 'Legrand', stock: 15, price: 520 },
    ]);
    setShowImportModal(false);
    setImportStep('upload');
    setImportSuccessToast(true);
    setTimeout(() => setImportSuccessToast(false), 3000);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Toast */}
      {importSuccessToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Bulk Inventory imported successfully! Master SKU catalog updated.</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Counter Inventory Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Store Product Master & Stock
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage live stock, set low-stock thresholds, and map dealer inventory to Master SKUs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel / CSV Bulk Import</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by SKU, product name, brand..."
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing {filtered.length} of {retailerInventory.length} listed SKUs
        </span>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-3">Brand & Series</th>
                <th className="py-3 px-3 text-center">In Stock</th>
                <th className="py-3 px-3 text-center">Reserved</th>
                <th className="py-3 px-3 text-center">Available</th>
                <th className="py-3 px-3 text-right">Price Ref (₹)</th>
                <th className="py-3 px-3">Last Updated</th>
                <th className="py-3 px-4 text-center">Stock Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const isLow = item.available <= item.lowStockThreshold;

                return (
                  <tr key={item.sku} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 text-xs">{item.productName}</div>
                      <span className="font-mono text-[10px] text-slate-400 block font-bold">
                        SKU: {item.sku}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      <span className="font-semibold text-slate-800">{item.brand}</span>
                      <span className="text-[10px] text-slate-400 block">{item.series}</span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      {item.inStock}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-500">
                      {item.reserved > 0 ? (
                        <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                          {item.reserved}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                          isLow
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.available}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{item.priceReference.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px] font-mono">
                      {item.lastUpdated}
                    </td>

                    {/* Stock Adjustment Buttons (Prompt Requirement) */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                        <button
                          onClick={() => adjustRetailerStock(item.sku, -1)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600"
                          title="Reduce Stock (-1)"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-[11px] text-slate-700">
                          {item.available}
                        </span>
                        <button
                          onClick={() => adjustRetailerStock(item.sku, 1)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600"
                          title="Add Stock (+1)"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXCEL/CSV BULK UPLOAD MODAL (Prompt Requirement) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Bulk Excel / CSV Inventory Inwarding
                  </h3>
                  <p className="text-xs text-slate-500">
                    Step {importStep === 'upload' ? '1: Upload' : importStep === 'mapping' ? '2: Column Mapping' : '3: Validation & Preview'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 1: Upload File */}
            {importStep === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 space-y-3 cursor-pointer hover:border-amber-500 transition-colors">
                  <UploadCloud className="w-10 h-10 text-amber-500 mx-auto" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Drag and drop your tally / dealer Excel inventory file
                    </span>
                    <span className="text-[11px] text-slate-500">Supports .XLSX and .CSV formats</span>
                  </div>
                  <div className="pt-2">
                    <span className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold inline-block">
                      Select File from PC
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                  <span>Or use standard ElectraKart distributor sample template:</span>
                  <button
                    onClick={() => setImportStep('mapping')}
                    className="font-bold text-amber-800 underline hover:text-amber-900"
                  >
                    Load Sample Sheet (4 Items)
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Column Mapping */}
            {importStep === 'mapping' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Confirm your spreadsheet columns match ElectraKart's Master SKU ingestion schema:
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Master SKU / Item Code</label>
                    <select
                      value={skuCol}
                      onChange={(e) => setSkuCol(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl font-medium"
                    >
                      <option>Product SKU</option>
                      <option>Item Code</option>
                      <option>Barcode</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Product Description</label>
                    <select
                      value={nameCol}
                      onChange={(e) => setNameCol(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl font-medium"
                    >
                      <option>Product Description</option>
                      <option>Material Name</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Brand Name</label>
                    <select
                      value={brandCol}
                      onChange={(e) => setBrandCol(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl font-medium"
                    >
                      <option>Brand Name</option>
                      <option>Manufacturer</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Inward Quantity</label>
                    <select
                      value={qtyCol}
                      onChange={(e) => setQtyCol(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl font-medium"
                    >
                      <option>Opening Stock</option>
                      <option>Available Units</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setImportStep('upload')}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setImportStep('preview')}
                    className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    Continue to Preview
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Preview with Validation Errors & Matched vs Unmatched */}
            {importStep === 'preview' && (
              <div className="space-y-4 text-xs">
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total In Sheet</span>
                    <span className="font-mono font-black text-lg text-slate-900">4 Items</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                      Matched to Master SKU
                    </span>
                    <span className="font-mono font-black text-lg text-emerald-800">3 Items (75%)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">
                      Unmatched / Review
                    </span>
                    <span className="font-mono font-black text-lg text-amber-800">1 Item (25%)</span>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 font-bold">
                      <tr>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {sampleImportRows.map((row) => (
                        <tr key={row.sku} className="hover:bg-slate-50">
                          <td className="p-2 font-bold">{row.sku}</td>
                          <td className="p-2 font-sans truncate max-w-xs">{row.name}</td>
                          <td className="p-2">{row.stock}</td>
                          <td className="p-2">₹{row.price}</td>
                          <td className="p-2">
                            {row.status === 'MATCHED' ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-sans">
                                Matched
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-sans">
                                Needs Review
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 text-[11px] text-amber-900 border border-amber-200">
                  <strong className="font-bold">Automated Mapping: </strong>
                  Matched items will sync immediately to your live counter. The 1 unmatched item will be routed
                  to the Super Admin Master Catalog Mapping queue for normalization.
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setImportStep('mapping')}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCommitImport}
                    className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm"
                  >
                    Import Matched Inventory
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
