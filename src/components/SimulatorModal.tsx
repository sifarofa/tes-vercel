/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sliders, RefreshCw, Upload, CheckCircle2, RotateCcw } from 'lucide-react';
import { DummyGeneratorConfig } from '../utils/dummyGenerator';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DummyGeneratorConfig;
  onApplyConfig: (cfg: DummyGeneratorConfig) => void;
  onUploadCsv: (file: File) => void;
  onResetAllEdits: () => void;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  config,
  onApplyConfig,
  onUploadCsv,
  onResetAllEdits
}) => {
  if (!isOpen) return null;

  const [seed, setSeed] = useState<number>(config.seed ?? 202701);
  const [pctHigh, setPctHigh] = useState<number>(Math.round((config.pctHighIncrease ?? 0.35) * 100));
  const [pctLow, setPctLow] = useState<number>(Math.round((config.pctSharpDecrease ?? 0.20) * 100));
  const [allowZero, setAllowZero] = useState<boolean>(config.allowZeroQuarters ?? false);
  const [quartersAvailable, setQuartersAvailable] = useState<1 | 2 | 3 | 4>(config.quartersAvailable ?? 2);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyConfig({
      seed,
      pctHighIncrease: pctHigh / 100,
      pctSharpDecrease: pctLow / 100,
      allowZeroQuarters: allowZero,
      quartersAvailable
    });
    onClose();
  };

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 900000) + 100000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setUploadError('Harap pilih file berformat .csv');
      return;
    }
    setUploadError(null);
    onUploadCsv(file);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pengaturan Simulasi Data 2027
              </h3>
              <p className="text-[11px] text-slate-500">
                Kalibrasi proporsi rasio anomali &amp; variasi data dummy
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleApply} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 text-sky-900 text-xs leading-relaxed">
            Data tahun <strong>2027</strong> (Triwulan III-2026, IV-2026, I-2027, II-2027) dihitung berbasis data tahun 2026 dengan pembagian skenario rasio agar Anda dapat menguji proses rekonsiliasi.
          </div>

          {/* Seed Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700">
                Random Seed (Reproducibility):
              </label>
              <button
                type="button"
                onClick={handleRandomizeSeed}
                className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Acak Seed</span>
              </button>
            </div>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 1)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono bg-white"
            />
          </div>

          {/* Slider: Porsi Peningkatan > 100% */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700">
                Proporsi Peningkatan Harga (Rasio &gt; 100%):
              </label>
              <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-sm">
                {pctHigh}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={pctHigh}
              onChange={(e) => setPctHigh(Number(e.target.value))}
              className="w-full accent-sky-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>10%</span>
              <span>Default: 35%</span>
              <span>70%</span>
            </div>
          </div>

          {/* Slider: Porsi Penurunan < 80% */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700">
                Proporsi Penurunan Drastis (Rasio &lt; 80%):
              </label>
              <span className="font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-sm">
                {pctLow}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={pctLow}
              onChange={(e) => setPctLow(Number(e.target.value))}
              className="w-full accent-rose-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>5%</span>
              <span>Default: 20%</span>
              <span>50%</span>
            </div>
          </div>

          {/* Quarters Available Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-semibold text-slate-700 block">
              Triwulan Berjalan yang Sudah Terkumpul:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${quartersAvailable === 2 ? 'bg-sky-50 border-sky-300 text-sky-950 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="quartersAvail"
                  checked={quartersAvailable === 2}
                  onChange={() => setQuartersAvailable(2)}
                  className="text-sky-600"
                />
                <span>Baru s.d. TW IV-2026 (2 TW)</span>
              </label>

              <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${quartersAvailable === 4 ? 'bg-sky-50 border-sky-300 text-sky-950 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="quartersAvail"
                  checked={quartersAvailable === 4}
                  onChange={() => setQuartersAvailable(4)}
                  className="text-sky-600"
                />
                <span>Lengkap s.d. TW II-2027 (4 TW)</span>
              </label>
            </div>
          </div>

          {/* Option: Allow Zero quarters */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="allowZeroCheck"
              checked={allowZero}
              onChange={(e) => setAllowZero(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
            />
            <label htmlFor="allowZeroCheck" className="text-xs text-slate-700 cursor-pointer">
              Simulasikan kasus harga 0 / toko tutup sementara (~2% peluang)
            </label>
          </div>

          {/* Upload CSV Option */}
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Atau Gunakan File CSV Baru Sendiri:
            </label>
            <div className="relative">
              <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg hover:border-sky-400 hover:bg-slate-50 cursor-pointer transition-colors text-slate-600 text-xs">
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Pilih file .csv dari komputer</span>
                <input
                  type="file"
                  accept=".csv,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            {uploadError && (
              <p className="text-[11px] text-rose-600 mt-1">{uploadError}</p>
            )}
          </div>

          {/* Reset All Changes */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset semua editan harga manual dan catatan rekonsiliasi ke data awal?')) {
                  onResetAllEdits();
                  onClose();
                }
              }}
              className="text-xs text-amber-700 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Editan Manual</span>
            </button>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Terapkan Parameter</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
