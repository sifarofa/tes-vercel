/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Calendar,
  Save,
  Edit3,
  Server,
  Building2,
  Check
} from 'lucide-react';
import { QualityBrandAnomalyRow, RespondentPriceItem, UserProfile } from '../types/ikk';
import { formatNumber, formatRupiah } from '../utils/csvParser';

interface QualityDetailModalProps {
  row: QualityBrandAnomalyRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (rowId: string, note: string, respondentIds: string[]) => void;
  onUpdateStatus: (rowId: string, status: RespondentPriceItem['rekonStatus'], respondentIds: string[]) => void;
  onOpenEditRespondent?: (item: RespondentPriceItem) => void;
  currentUser?: UserProfile | null;
  onRequestLogin?: (reason?: 'upload' | 'catatan' | 'general') => void;
}

export const QualityDetailModal: React.FC<QualityDetailModalProps> = ({
  row,
  isOpen,
  onClose,
  onSaveNote,
  onUpdateStatus,
  onOpenEditRespondent,
  currentUser,
  onRequestLogin
}) => {
  if (!isOpen || !row) return null;

  const [note, setNote] = useState<string>(row.catatanRekon || '');
  const [status, setStatus] = useState<RespondentPriceItem['rekonStatus']>(row.rekonStatus);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (row) {
      setNote(row.catatanRekon || '');
      setStatus(row.rekonStatus);
      setSavedSuccess(false);
    }
  }, [row]);

  const handleSave = () => {
    const respondentIds = row.respondents.map(r => r.id);
    onSaveNote(row.id, note, respondentIds);
    onUpdateStatus(row.id, status, respondentIds);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const isHighRatio = row.rasio > 120;
  const isLowRatio = row.rasio < 80;
  const isHighCv = row.cv2027 > 20;

  // Calculate quarter averages across all respondents for Year 2026/2027
  const calcQuarterAvg = (field: 'q3_2026' | 'q4_2026' | 'q1_2027' | 'q2_2027') => {
    const valid = row.respondents.map(r => r[field]).filter(p => p > 0);
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  };

  const avgQ3_2026 = calcQuarterAvg('q3_2026');
  const avgQ4_2026 = calcQuarterAvg('q4_2026');
  const avgQ1_2027 = calcQuarterAvg('q1_2027');
  const avgQ2_2027 = calcQuarterAvg('q2_2027');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-white border border-slate-200 text-slate-700 font-semibold">
                [{row.kodeKab}] {row.namaKab}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-medium">
                {row.jenisKuesioner}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {row.namaKomoditas} <span className="font-normal text-slate-600">- {row.kualitasRekon}</span>
            </h3>

            <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">
                Merek: <span className="text-sky-800 italic">{row.namaMerek || '-'}</span>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                Satuan: <strong className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-xs">{row.satuan}</strong>
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">
                {row.respondentCount} Responden Terdata
              </span>
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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 font-mono tabular-nums text-xs">
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">Harga 2026 (Tahun Lalu)</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{formatRupiah(row.avg2026)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">Harga 2027 (Tahun Berjalan)</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{formatRupiah(row.avg2027)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">CV Antar-Responden</span>
              <span className={`font-bold text-sm mt-0.5 inline-block ${isHighCv ? 'text-purple-700 font-extrabold' : 'text-slate-800'}`}>
                {formatNumber(row.cv2027, 2)}%
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">Rasio 2027 / 2026</span>
              <span className={`font-bold text-xs mt-0.5 inline-block px-2 py-0.5 rounded-md ${
                isLowRatio 
                  ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                  : isHighRatio 
                    ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {formatNumber(row.rasio, 2)}%
              </span>
            </div>
          </div>

          {/* Rincian Harga Antar Responden (Tahun Berjalan 2026/2027) - CLEAN TABLE WITHOUT ANY GRAPH */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800 text-xs">
                  Rincian Harga Antar-Responden (Tahun Berjalan 2026 / 2027)
                </span>
              </div>
              <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                Tabel 7.1
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono tabular-nums">
                <thead className="bg-slate-50/80 text-[11px] text-slate-600 font-sans border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3.5 text-left min-w-[200px]">Responden &amp; Lokasi</th>
                    <th className="py-2.5 px-3 text-right font-medium">TW III - 2026</th>
                    <th className="py-2.5 px-3 text-right font-medium">TW IV - 2026</th>
                    <th className="py-2.5 px-3 text-right font-medium">TW I - 2027</th>
                    <th className="py-2.5 px-3 text-right font-medium">TW II - 2027</th>
                    <th className="py-2.5 px-3.5 text-right font-bold text-slate-900">Rata-rata 2027</th>
                    {onOpenEditRespondent && (
                      <th className="py-2.5 px-3 text-center font-sans w-16">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {row.respondents.map((resp, idx) => (
                    <tr key={resp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-2 px-3.5 font-sans">
                        <div className="font-semibold text-slate-900 line-clamp-1" title={resp.namaResp}>
                          {resp.namaResp}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>{resp.kodeResp}</span>
                          {resp.namaMerek && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="italic text-slate-600">{resp.namaMerek}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-3 text-right">
                        {resp.q3_2026 > 0 ? (
                          formatRupiah(resp.q3_2026)
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right">
                        {resp.q4_2026 > 0 ? (
                          formatRupiah(resp.q4_2026)
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right">
                        {resp.q1_2027 > 0 ? (
                          formatRupiah(resp.q1_2027)
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right">
                        {resp.q2_2027 > 0 ? (
                          formatRupiah(resp.q2_2027)
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3.5 text-right font-bold text-slate-900">
                        {formatRupiah(resp.avg2027)}
                      </td>

                      {onOpenEditRespondent && (
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (currentUser?.role !== 'owner') {
                                alert('Edit data harga hanya dapat dilakukan oleh Pemilik Akun (sifarofatunnisa24@gmail.com). Silakan login terlebih dahulu.');
                                onRequestLogin?.('general');
                                return;
                              }
                              onOpenEditRespondent(resp);
                            }}
                            title="Edit harga responden ini"
                            className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer: Average Across All Respondents */}
                <tfoot className="bg-slate-100/80 font-bold border-t border-slate-200 text-xs">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3.5 text-slate-800 font-sans uppercase text-[11px] tracking-wider">
                      Rata-rata Seluruh Responden
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      {avgQ3_2026 > 0 ? formatRupiah(avgQ3_2026) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      {avgQ4_2026 > 0 ? formatRupiah(avgQ4_2026) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      {avgQ1_2027 > 0 ? formatRupiah(avgQ1_2027) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      {avgQ2_2027 > 0 ? formatRupiah(avgQ2_2027) : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-sky-900 font-extrabold">
                      {formatRupiah(row.avg2027)}
                    </td>
                    {onOpenEditRespondent && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Form: Status Verifikasi & Catatan Konfirmasi Lapangan */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Catatan Rekonsiliasi &amp; Konfirmasi Lapangan</span>
              {savedSuccess && (
                <span className="text-emerald-600 font-sans text-xs flex items-center gap-1 font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tersimpan ke Server!</span>
                </span>
              )}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Status Validasi Rekon:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="belum_verifikasi">Belum Diverifikasi</option>
                  <option value="valid_terkonfirmasi">Valid Terkonfirmasi (Sudah Dicek)</option>
                  <option value="perlu_konfirmasi">Perlu Konfirmasi Lapangan</option>
                  <option value="telah_diimputasi">Telah Disesuaikan / Diimputasi</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Penyimpanan Server:
                </label>
                <div className="text-slate-500 text-[11px] py-2 flex items-center gap-1.5 font-sans">
                  <Server className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersinkronisasi otomatis ke server database</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Catatan Hasil Konfirmasi (Alasan Kenaikan / Penurunan / Variasi Harga):
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Sudah konfirmasi ke toko, harga semen naik karena ongkos angkut ponton sungai naik saat musim kemarau..."
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
                <span>Simpan Catatan &amp; Status ke Server</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
