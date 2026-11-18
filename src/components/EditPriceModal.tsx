/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Save, Edit3, RotateCcw, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { RespondentPriceItem } from '../types/ikk';
import { formatNumber, formatRupiah } from '../utils/csvParser';

interface EditPriceModalProps {
  item: RespondentPriceItem | null;
  onClose: () => void;
  onSaveEdit: (id: string, edits: { q3_2026: number; q4_2026: number; q1_2027: number; q2_2027: number; catatan?: string }) => void;
}

export const EditPriceModal: React.FC<EditPriceModalProps> = ({
  item,
  onClose,
  onSaveEdit
}) => {
  if (!item) return null;

  const [q3_2026, setQ3_2026] = useState<number>(item.q3_2026);
  const [q4_2026, setQ4_2026] = useState<number>(item.q4_2026);
  const [q1_2027, setQ1_2027] = useState<number>(item.q1_2027);
  const [q2_2027, setQ2_2027] = useState<number>(item.q2_2027);
  const [catatan, setCatatan] = useState<string>(item.catatanRekon || '');

  // Live recalculate
  const valid2027 = [q3_2026, q4_2026, q1_2027, q2_2027].filter(v => v > 0);
  const newAvg2027 = valid2027.length > 0 
    ? valid2027.reduce((a, b) => a + b, 0) / valid2027.length 
    : 0;

  const newRasio = item.avg2026 > 0 ? (newAvg2027 / item.avg2026) * 100 : 100;
  const newSelisih = newAvg2027 - item.avg2026;
  const newGrowth = item.avg2026 > 0 ? ((newAvg2027 - item.avg2026) / item.avg2026) * 100 : 0;

  const isHigh = newRasio > 100;
  const isLow = newRasio < 80;

  const handleApplyAdjustment = (pct: number) => {
    const factor = 1 + pct / 100;
    setQ3_2026(Math.round(item.avg2026 * factor));
    setQ4_2026(Math.round(item.avg2026 * factor));
    setQ1_2027(Math.round(item.avg2026 * factor));
    setQ2_2027(Math.round(item.avg2026 * factor));
  };

  const handleReset = () => {
    setQ3_2026(item.q3_2026);
    setQ4_2026(item.q4_2026);
    setQ1_2027(item.q1_2027);
    setQ2_2027(item.q2_2027);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveEdit(item.id, {
      q3_2026,
      q4_2026,
      q1_2027,
      q2_2027,
      catatan
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Koreksi / Edit Harga 2027
              </h3>
              <p className="text-[11px] text-slate-500">
                {item.namaKab} · {item.namaResp}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="font-semibold text-slate-900">
              {item.namaKomoditas} - {item.kualitasRekon}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Satuan: {item.satuan} · Basis Rata-rata 2026: <strong className="text-slate-900 font-mono">{formatRupiah(item.avg2026)}</strong>
            </div>
          </div>

          {/* Quick adjustment buttons */}
          <div>
            <div className="text-[11px] font-semibold text-slate-700 mb-1.5">
              Penyesuaian Cepat Terhadap 2026:
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleApplyAdjustment(0)}
                className="px-2 py-1 text-[11px] rounded-md border border-slate-200 bg-white hover:bg-slate-50"
              >
                Sama 2026 (0%)
              </button>
              <button
                type="button"
                onClick={() => handleApplyAdjustment(3)}
                className="px-2 py-1 text-[11px] rounded-md border border-slate-200 bg-white hover:bg-slate-50"
              >
                Inflasi +3%
              </button>
              <button
                type="button"
                onClick={() => handleApplyAdjustment(5)}
                className="px-2 py-1 text-[11px] rounded-md border border-slate-200 bg-white hover:bg-slate-50"
              >
                Inflasi +5%
              </button>
              <button
                type="button"
                onClick={() => handleApplyAdjustment(15)}
                className="px-2 py-1 text-[11px] rounded-md border border-sky-200 bg-sky-50 text-sky-800"
              >
                Naik +15%
              </button>
              <button
                type="button"
                onClick={() => handleApplyAdjustment(-25)}
                className="px-2 py-1 text-[11px] rounded-md border border-rose-200 bg-rose-50 text-rose-800"
              >
                Turun -25% (&lt; 80)
              </button>
            </div>
          </div>

          {/* Input Quarters for Year 2027 */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold text-slate-900">
              Harga Triwulan Tahun 2027 (Rupiah):
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Triwulan III-2026:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={q3_2026}
                  onChange={(e) => setQ3_2026(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Triwulan IV-2026:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={q4_2026}
                  onChange={(e) => setQ4_2026(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Triwulan I-2027:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={q1_2027}
                  onChange={(e) => setQ1_2027(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Triwulan II-2027:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={q2_2027}
                  onChange={(e) => setQ2_2027(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Live Recalculation Results Preview */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="text-[11px] font-semibold text-slate-700">
              Hasil Rekalkulasi Langsung:
            </div>
            
            <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] font-sans text-slate-400 block">Avg 2027 Baru</span>
                <span className="font-bold text-slate-900">{formatRupiah(newAvg2027)}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] font-sans text-slate-400 block">Rasio 27/26</span>
                <span className={`font-bold inline-block px-1 rounded-xs ${
                  isLow ? 'text-rose-700 bg-rose-50' : isHigh ? 'text-sky-800 bg-sky-50' : 'text-emerald-700 bg-emerald-50'
                }`}>
                  {formatNumber(newRasio, 1)}%
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] font-sans text-slate-400 block">Pertumbuhan</span>
                <span className={`font-bold ${newGrowth > 0 ? 'text-sky-700' : newGrowth < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                  {newGrowth > 0 ? '+' : ''}{formatNumber(newGrowth, 1)}%
                </span>
              </div>
            </div>

            {isLow && (
              <div className="text-[11px] text-rose-700 flex items-center gap-1.5 font-medium mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Rasio &lt; 80%: Penurunan harga lebih dari 20%</span>
              </div>
            )}
            {isHigh && (
              <div className="text-[11px] text-sky-800 flex items-center gap-1.5 font-medium mt-1">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>Rasio &gt; 100%: Mengalami peningkatan harga</span>
              </div>
            )}
          </div>

          {/* Catatan Koreksi */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Catatan Alasan Koreksi / Imputasi:
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Misal: Penyesuaian imputasi rata-rata sub-kategori kabupaten..."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembalikan</span>
            </button>

            <div className="flex items-center gap-2">
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
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
