import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  Store,
  Clock,
  Layers,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ConfidenceLevel } from '../../types';

export const EstimateReviewPage: React.FC = () => {
  const {
    currentEstimateItems,
    resolveEstimateItem,
    addManualEstimateItem,
    removeEstimateItem,
    createQuotationFromEstimate,
    currentCity,
    pincode,
  } = useStore();
  const navigate = useNavigate();

  // Selected item for disambiguation modal
  const [activeClarificationId, setActiveClarificationId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);

  // Fallback if user navigates here directly without scanning
  if (!currentEstimateItems || currentEstimateItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
          <FileCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Active Estimate Scanned</h2>
        <p className="text-xs text-slate-500">Please upload an estimate document or choose a sample bill first.</p>
        <Link
          to="/customer/estimate"
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl"
        >
          Go to Upload Estimate
        </Link>
      </div>
    );
  }

  const unresolvedCount = currentEstimateItems.filter((i) => i.confidence !== 'HIGH').length;

  const handleGenerateQuote = () => {
    const quotation = createQuotationFromEstimate();
    navigate(`/customer/quotation/${quotation.id}`);
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    addManualEstimateItem(newItemText.trim(), newItemQty);
    setNewItemText('');
    setNewItemQty(1);
    setShowAddModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>ElectraAI Parsing Complete</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Review Extracted Estimate Materials
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {currentEstimateItems.length} items extracted • {unresolvedCount > 0 ? (
              <span className="text-amber-700 font-bold">{unresolvedCount} item needs specification review</span>
            ) : (
              <span className="text-emerald-700 font-bold">All items 100% matched to Master SKUs</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>

          <button
            onClick={handleGenerateQuote}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all hover:scale-102"
          >
            <FileCheck className="w-4 h-4 fill-slate-950" />
            <span>Generate Locked Quotation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Disambiguation Attention Banner if any unresolved item */}
      {unresolvedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-sm block">Clarification Required on Extracted Items</span>
            <p className="text-amber-800 mt-0.5">
              ElectraKart never silently guesses specifications. Items marked in <strong>Amber</strong> require you
              to select the exact series (e.g. traditional <em>Penta</em> vs modular <em>Roma</em>) before locking
              the quotation.
            </p>
          </div>
        </div>
      )}

      {/* Extracted Items List */}
      <div className="space-y-4">
        {currentEstimateItems.map((item, idx) => {
          const isHigh = item.confidence === 'HIGH';
          const isMed = item.confidence === 'MEDIUM';

          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all ${
                isHigh
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-400/20 shadow-sm'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-700 flex items-center justify-center">
                      {idx + 1}
                    </span>

                    {/* Confidence Badges */}
                    {isHigh && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> High Confidence
                      </span>
                    )}

                    {isMed && (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Medium Confidence - Needs Review
                      </span>
                    )}

                    {item.matchedProduct && (
                      <span className="font-mono text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                        SKU: {item.matchedProduct.sku}
                      </span>
                    )}
                  </div>

                  {/* Extracted Raw Text */}
                  <div className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded inline-block">
                    Original Note: "{item.rawText}"
                  </div>

                  {/* Resolved name & specs */}
                  <h3 className="text-sm font-bold text-slate-900">
                    {item.matchedProduct ? item.matchedProduct.name : item.detectedBrand + ' ' + item.detectedConfig}
                  </h3>

                  <p className="text-xs text-slate-600">
                    {item.reason}
                  </p>
                </div>

                {/* Right: Quantity & Actions */}
                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Quantity</span>
                    <span className="font-mono font-extrabold text-sm text-slate-900">
                      {item.quantity} {item.unit}
                    </span>
                  </div>

                  {item.matchedProduct && (
                    <div className="text-right border-l border-slate-200 pl-4">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Rate</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ₹{(item.matchedProduct.sellingPrice * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {/* If Medium Confidence: Show Series Disambiguation Trigger */}
                  {isMed && item.possibleOptions && (
                    <button
                      onClick={() => setActiveClarificationId(item.id)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Select Series</span>
                    </button>
                  )}

                  <button
                    onClick={() => removeEstimateItem(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inline Disambiguation Options Box (Opens for Anchor 6-9 Switch) */}
              {activeClarificationId === item.id && item.possibleOptions && (
                <div className="mt-4 pt-4 border-t border-amber-200 bg-white p-4 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Choose exact series for <strong className="text-amber-600">"{item.rawText}"</strong>:
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Penta vs Roma Classic</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {item.possibleOptions.map((opt) => (
                      <div
                        key={opt.matchedSku}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/60 hover:bg-amber-50/30 transition-all flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-slate-500">
                              SKU: {opt.matchedSku}
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-900">
                              ₹{opt.price.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-xs text-slate-900 mt-1">{opt.productName}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{opt.specification}</p>
                        </div>

                        <button
                          onClick={() => {
                            resolveEstimateItem(item.id, {
                              sku: opt.matchedSku,
                              brand: opt.brand,
                              series: opt.series,
                              spec: opt.specification,
                            });
                            setActiveClarificationId(null);
                          }}
                          className="w-full py-2 bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 font-bold text-xs rounded-lg transition-colors"
                        >
                          Select {opt.series}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Actions Bar */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 font-mono">
            48-Hour Price Lock Protection
          </span>
          <h3 className="text-base font-bold text-white">
            Ready to convert estimate to guaranteed trade quotation?
          </h3>
          <p className="text-xs text-slate-400">
            Fulfillment routed from verified stores in {currentCity} ({pincode}).
          </p>
        </div>

        <button
          onClick={handleGenerateQuote}
          className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-md transition-all hover:scale-102 flex items-center justify-center gap-2"
        >
          <FileCheck className="w-4 h-4 fill-slate-950" />
          <span>Generate Official Quotation</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Manual Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900">Add Line Item to Estimate</h3>
            <form onSubmit={handleAddNewItem} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Product Description / Note</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anchor Roma 6-Module Plate or 2.5mm wire"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
