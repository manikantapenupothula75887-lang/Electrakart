import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload,
  FileText,
  Camera,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Clock,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SAMPLE_ESTIMATES } from '../../data/mockData';

export const EstimateUploadPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sampleParam = searchParams.get('sample');
  const { startEstimateAnalysis, isProcessingEstimate, estimateStage } = useStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string>(sampleParam || 'estimate-sample-1');
  const [manualNote, setManualNote] = useState('');
  const [uploadMode, setUploadMode] = useState<'sample' | 'file' | 'manual'>(sampleParam ? 'sample' : 'sample');
  const navigate = useNavigate();

  const handleStartScan = async () => {
    if (uploadMode === 'sample') {
      await startEstimateAnalysis(selectedSampleId);
    } else {
      await startEstimateAnalysis('estimate-sample-1', manualNote);
    }
    navigate('/customer/estimate/review');
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadMode('file');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Processing Overlay Screen */}
      {isProcessingEstimate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
              <Zap className="w-8 h-8 text-amber-400 fill-amber-400 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold tracking-widest text-amber-400 font-mono">
                ElectraAI Neural OCR Active
              </span>
              <h3 className="text-xl font-extrabold text-white">{estimateStage}</h3>
              <p className="text-xs text-slate-400">
                Cross-referencing Polycab, Finolex, Anchor & Schneider master catalogs...
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Locking wholesale pricing for verified inventory</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Automated Material Extraction</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          Upload Your Electrical Estimate
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Upload handwritten contractor bills, architect drawings or commercial BOQs. Our AI parses materials,
          identifies exact SKUs, and locks in nearby trade pricing.
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center justify-center gap-2 bg-slate-200/70 p-1 rounded-2xl max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setUploadMode('sample')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
            uploadMode === 'sample' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sample Estimates (1-Click)
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('file')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
            uploadMode === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Upload Document / Photo
        </button>
      </div>

      {/* Mode A: 1-Click Sample Estimate Selection */}
      {uploadMode === 'sample' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-600" />
              <span>Choose Realistic Contractor Estimate for Phase 1 Demo:</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">2 Samples Available</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SAMPLE_ESTIMATES.map((sample) => {
              const isSelected = selectedSampleId === sample.id;
              return (
                <div
                  key={sample.id}
                  onClick={() => setSelectedSampleId(sample.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/40 shadow-sm ring-2 ring-amber-400/30'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        {sample.extractedItemsCount} Line Items
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900">{sample.title}</h4>
                    <p className="text-[11px] text-slate-500">{sample.electricianName}</p>
                    <p className="text-[10px] text-slate-400 italic">{sample.siteLocation}</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] text-slate-700 font-mono line-clamp-4 whitespace-pre-wrap">
                    {sample.rawNoteText}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleStartScan}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Process Selected Estimate with ElectraAI</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mode B: File Upload / Camera Mock */}
      {uploadMode === 'file' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-3xl p-8 text-center bg-slate-50/60 hover:bg-amber-50/20 transition-all space-y-4 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900">
                {selectedFile ? `Selected: ${selectedFile.name}` : 'Drag & drop estimate photo or PDF'}
              </h4>
              <p className="text-xs text-slate-500">Supports JPG, JPEG, PNG and PDF formats (up to 25MB)</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                Browse Files
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  alert('Camera Capture Modal (Integration Placeholder: Real mobile camera feed will bind here in Phase 2).');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Contractor Bill</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleStartScan}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Process Uploaded Estimate</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quality Guarantees */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">Never Silently Guesses</span>
            <span className="text-slate-500 text-[11px]">Ambiguous specs prompt clarification</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-3">
          <Zap className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">Locked 48h Pricing</span>
            <span className="text-slate-500 text-[11px]">Protects against daily copper swings</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">Instant PDF Quotation</span>
            <span className="text-slate-500 text-[11px]">Download, share on WhatsApp, or order</span>
          </div>
        </div>
      </div>
    </div>
  );
};
