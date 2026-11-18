/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Save, 
  CheckCircle2, 
  Calendar,
  Layers,
  Edit3
} from 'lucide-react';
import { RespondentPriceItem } from '../types/ikk';
import { formatNumber, formatRupiah } from '../utils/csvParser';

interface RespondentDetailModalProps {
  item: RespondentPriceItem | null;
  onClose: () => void;
  onSaveNote: (id: string, note: string) => void;
  onUpdateStatus: (id: string, status: RespondentPriceItem['rekonStatus']) => void;
  onOpenEdit: (item: RespondentPriceItem) => void;
}

export const RespondentDetailModal: React.FC<RespondentDetailModalProps> = ({
  item,
  onClose,
  onSaveNote,
  onUpdateStatus,
  onOpenEdit
}) => {
  if (!item) return null;

  const [note, setNote] = useState(item.catatanRekon || '');
  const [status, setStatus] = useState(item.rekonStatus);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Rincian harga antar responden untuk tahun berjalan saja (TW III-2026 s.d. TW II-2027)
  const timeline = [
    { label: 'TW III - 2026', periode: 'Triwulan 3 (Tahun 2026)', price: item.q3_2026 },
    { label: 'TW IV - 2026', periode: 'Triwulan 4 (Tahun 2026)', price: item.q4_2026 },
    { label: 'TW I - 2027', periode: 'Triwulan 1 (Tahun 2027)', price: item.q1_2027 },
    { label: 'TW II - 2027', periode: 'Triwulan 2 (Tahun 2027)', price: item.q2_2027 },
  ];

  const handleSave = () => {
    onSaveNote(item.id, note);
    onUpdateStatus(item.id, status);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const isHigh = item.rasio > 100;
  const isLow = item.rasio < 80;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-white border border-slate-200 text-slate-700 font-semibold">
                [{item.kodeKab}] {item.namaKab}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-mono">
                Responden #{item.kodeResp}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              {item.namaResp}
            </h3>
            <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
              <span className="font-semibold text-sky-800">{item.namaKomoditas}</span>
              <span className="text-slate-300">·</span>
              <span>{item.kualitasRekon}</span>
              {item.namaMerek && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="italic text-slate-500">Merek: {item.namaMerek}</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          
          {/* Key Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 font-mono tabular-nums text-xs">
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">Rata-rata 2026</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{formatRupiah(item.avg2026)}</span>
              <span className="text-[10px] text-slate-400">CV: {formatNumber(item.cv2026, 1)}%</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">Rata-rata 2027</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{formatRupiah(item.avg2027)}</span>
              <span className="text-[10px] text-slate-400">CV: {formatNumber(item.cv2027, 1)}%</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">Rasio 2027/2026</span>
              <span className={`font-bold text-sm mt-0.5 inline-block px-1.5 py-0.5 rounded-xs ${
                isLow ? 'bg-rose-100 text-rose-800' : isHigh ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {formatNumber(item.rasio, 2)}%
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">Selisih Nominal</span>
              <span className={`font-bold text-sm mt-0.5 block ${item.selisih > 0 ? 'text-sky-700' : item.selisih < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                {item.selisih > 0 ? '+' : ''}{formatRupiah(item.selisih)}
              </span>
              <span className="text-[10px] text-slate-400">
                {item.selisih > 0 ? '+' : ''}{formatNumber(item.growthPercent, 1)}%
              </span>
            </div>
          </div>

          {/* Detailed Current Year (Tahun Berjalan 2026/2027) Breakdown Table - Chart Removed */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800 text-xs">
                  Rincian Harga Antar-Triwulan Responden (Tahun Berjalan 2026/2027)
                </span>
              </div>
              <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                Tabel 7.1
              </span>
            </div>

            <table className="w-full text-xs font-mono tabular-nums">
              <thead className="bg-slate-50/70 text-[11px] text-slate-600 font-sans border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5 text-left">Triwulan Berjalan</th>
                  <th className="py-2.5 px-3 text-left">Periode Survei</th>
                  <th className="py-2.5 px-3.5 text-right font-bold">Harga Responden (Rp)</th>
                  <th className="py-2.5 px-3 text-center">Status Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {timeline.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3.5 font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{t.label}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-sans">
                      {t.periode}
                    </td>
                    <td className="py-2 px-3.5 text-right font-bold text-slate-900 text-sm">
                      {t.price > 0 ? (
                        formatRupiah(t.price)
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">Rp 0 (Belum Tersedia)</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-sans text-[11px]">
                      {t.price > 0 ? (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200">
                          Tersedia
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-xs border border-slate-200">
                          Menunggu Survei
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Form: Status Verifikasi & Catatan Konfirmasi Lapangan */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Catatan Rekonsiliasi &amp; Konfirmasi Lapangan</span>
              {savedSuccess && (
                <span className="text-emerald-600 font-sans text-xs flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tersimpan!</span>
                </span>
              )}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Status Validasi Data:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="belum_verifikasi">Belum Diverifikasi</option>
                  <option value="valid_terkonfirmasi">Valid Terkonfirmasi (Sudah Dicek)</option>
                  <option value="perlu_konfirmasi">Perlu Konfirmasi Lapangan</option>
                  <option value="telah_diimputasi">Telah Disesuaikan / Diimputasi</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Aksi Lanjutan:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEdit(item);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Koreksi / Edit Harga 2027</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Catatan Hasil Konfirmasi (Alasan Kenaikan / Penurunan):
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Sudah konfirmasi ke pemilik toko, harga semen naik karena ongkos angkut ponton sungai naik saat musim kemarau..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Catatan &amp; Status</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
