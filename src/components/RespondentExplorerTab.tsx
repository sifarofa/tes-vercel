/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  MapPin, 
  Eye, 
  Edit3, 
  AlertTriangle,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { RespondentPriceItem } from '../types/ikk';
import { formatNumber } from '../utils/csvParser';

interface RespondentExplorerTabProps {
  items: RespondentPriceItem[];
  kabKotaList: { kode: string; nama: string; recordCount: number }[];
  onOpenDetail: (item: RespondentPriceItem) => void;
  onOpenEdit: (item: RespondentPriceItem) => void;
}

type CommoditySortField = 
  | 'namaKomoditas' 
  | 'satuan' 
  | 'namaMerek' 
  | 'q3_2025' 
  | 'q4_2025' 
  | 'q1_2026' 
  | 'q2_2026' 
  | 'avg2026' 
  | 'q3_2026' 
  | 'q4_2026' 
  | 'q1_2027' 
  | 'q2_2027' 
  | 'avg2027' 
  | 'rasio';

export const RespondentExplorerTab: React.FC<RespondentExplorerTabProps> = ({
  items,
  kabKotaList,
  onOpenDetail,
  onOpenEdit
}) => {
  const [selectedKab, setSelectedKab] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRespCode, setSelectedRespCode] = useState<string>('');

  // Sorting state for respondent's commodities table
  const [sortField, setSortField] = useState<CommoditySortField>('namaKomoditas');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: CommoditySortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Group items by respondent
  const respondentsList = useMemo(() => {
    const map = new Map<string, { kodeResp: string; namaResp: string; kodeKab: string; namaKab: string; itemCount: number; anomalyCount: number }>();

    items.forEach(item => {
      if (selectedKab && item.kodeKab !== selectedKab) return;

      const key = `${item.kodeKab}_${item.kodeResp}`;
      if (!map.has(key)) {
        map.set(key, {
          kodeResp: item.kodeResp,
          namaResp: item.namaResp,
          kodeKab: item.kodeKab,
          namaKab: item.namaKab,
          itemCount: 0,
          anomalyCount: 0
        });
      }
      const entry = map.get(key)!;
      entry.itemCount++;
      if (item.rasio > 100 || item.rasio < 80) {
        entry.anomalyCount++;
      }
    });

    let list = Array.from(map.values()).sort((a, b) => a.namaResp.localeCompare(b.namaResp));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.namaResp.toLowerCase().includes(q) || r.kodeResp.toLowerCase().includes(q) || r.namaKab.toLowerCase().includes(q));
    }

    return list;
  }, [items, selectedKab, searchQuery]);

  // Set default selected respondent if not set
  const activeRespKey = selectedRespCode || (respondentsList[0] ? `${respondentsList[0].kodeKab}_${respondentsList[0].kodeResp}` : '');

  // Get items for the selected respondent and sort them
  const activeRespondentItems = useMemo(() => {
    if (!activeRespKey) return [];
    const [kab, resp] = activeRespKey.split('_');
    const filtered = items.filter(i => i.kodeKab === kab && i.kodeResp === resp);

    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return sortDirection === 'asc' ? (valA - valB) : (valB - valA);
    });
  }, [items, activeRespKey, sortField, sortDirection]);

  const activeRespondentInfo = useMemo(() => {
    return respondentsList.find(r => `${r.kodeKab}_${r.kodeResp}` === activeRespKey);
  }, [respondentsList, activeRespKey]);

  // Helper for sortable column header
  const renderSortableTh = (
    label: string, 
    field: CommoditySortField, 
    align: 'left' | 'right' | 'center' = 'left',
    extraClass: string = ''
  ) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`py-2 px-2 select-none cursor-pointer hover:bg-slate-200/70 transition-colors ${extraClass} ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
        title={`Urutkan ${label}`}
      >
        <div className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'} w-full`}>
          <span>{label}</span>
          <span className="shrink-0 text-slate-500">
            {isSorted ? (
              sortDirection === 'asc' ? <ArrowUp className="w-2.5 h-2.5 text-sky-700" /> : <ArrowDown className="w-2.5 h-2.5 text-sky-700" />
            ) : (
              <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-4 w-full">
      
      {/* Header Info Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-700">
                <Building2 className="w-4 h-4" />
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Penelusuran Sampai Level Responden
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Periksa catatan harga seluruh komoditas per toko bangunan, penyedia alat berat, atau dinas PU di setiap triwulan (dilengkapi fitur sortir kolom)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedKab}
              onChange={(e) => {
                setSelectedKab(e.target.value);
                setSelectedRespCode('');
              }}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-hidden"
            >
              <option value="">Semua Wilayah ({kabKotaList.length} Kab/Kota)</option>
              {kabKotaList.map(kab => (
                <option key={kab.kode} value={kab.kode}>
                  [{kab.kode}] {kab.nama}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Respondent Directory (Left) & Commodity Price Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full">
        
        {/* Left Column: Respondent Directory */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Daftar Responden ({respondentsList.length})
              </h3>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama toko / instansi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-h-[680px] overflow-y-auto pr-1">
            {respondentsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Tidak ada responden yang sesuai pencarian
              </div>
            ) : (
              respondentsList.map(resp => {
                const key = `${resp.kodeKab}_${resp.kodeResp}`;
                const isSelected = key === activeRespKey;

                return (
                  <div
                    key={key}
                    onClick={() => setSelectedRespCode(key)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-indigo-400 bg-indigo-50/50 shadow-xs' 
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {resp.namaResp}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{resp.namaKab}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono text-[10px] text-slate-400">ID: {resp.kodeResp}</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'}`} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-100/80">
                      <span className="text-slate-500">
                        {resp.itemCount} komoditas
                      </span>
                      {resp.anomalyCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-xs border border-amber-200">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>{resp.anomalyCount} anomali</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Wajar ✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Column: Full Quarterly Price History of Active Respondent */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4 overflow-hidden">
          
          {activeRespondentInfo ? (
            <>
              {/* Respondent Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {activeRespondentInfo.namaResp}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 rounded-sm text-slate-700 border border-slate-200">
                      ID: {activeRespondentInfo.kodeResp}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeRespondentInfo.namaKab} (Kode {activeRespondentInfo.kodeKab})</span>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>Total {activeRespondentItems.length} komoditas disurvei</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Urutan: <strong>{sortField}</strong> ({sortDirection.toUpperCase()})
                </div>
              </div>

              {/* Commodities Table with all Quarters & Full Sorting */}
              <div className="border border-slate-200 rounded-xs overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    {/* Header Level 1: Years */}
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center text-[11px]">
                      <th colSpan={3} className="py-2 px-3 text-left">Komoditas &amp; Merek</th>
                      <th colSpan={5} className="py-2 px-2 bg-slate-200/60 border-l border-r border-slate-300">
                        Tahun Lalu (Sheet Rekonda 2026)
                      </th>
                      <th colSpan={5} className="py-2 px-2 bg-emerald-100/50 border-r border-emerald-200">
                        Tahun Berjalan (Tabel 7.1)
                      </th>
                      <th colSpan={2} className="py-2 px-2 bg-amber-100/60">
                        Rekonsiliasi
                      </th>
                    </tr>

                    {/* Header Level 2: Quarters with Sorting */}
                    <tr className="bg-slate-50 text-[11px] text-slate-600 font-semibold border-b border-slate-200 select-none">
                      {renderSortableTh('Komoditas', 'namaKomoditas', 'left', 'min-w-[130px]')}
                      {renderSortableTh('Satuan', 'satuan', 'center', 'w-14')}
                      {renderSortableTh('Merek', 'namaMerek', 'left', 'min-w-[80px]')}

                      {/* 2026: Q3-25, Q4-25, Q1-26, Q2-26, Avg */}
                      {renderSortableTh('III-25', 'q3_2025', 'right', 'font-mono border-l border-slate-200 min-w-[70px]')}
                      {renderSortableTh('IV-25', 'q4_2025', 'right', 'font-mono min-w-[70px]')}
                      {renderSortableTh('I-26', 'q1_2026', 'right', 'font-mono min-w-[70px]')}
                      {renderSortableTh('II-26', 'q2_2026', 'right', 'font-mono min-w-[70px]')}
                      {renderSortableTh('Harga \'26', 'avg2026', 'right', 'font-mono font-bold bg-slate-100 text-slate-900 border-r border-slate-200 min-w-[80px]')}

                      {/* 2027: Q3-26, Q4-26, Q1-27, Q2-27, Avg */}
                      {renderSortableTh('III-26', 'q3_2026', 'right', 'font-mono text-emerald-800 min-w-[70px]')}
                      {renderSortableTh('IV-26', 'q4_2026', 'right', 'font-mono text-emerald-800 min-w-[70px]')}
                      {renderSortableTh('I-27', 'q1_2027', 'right', 'font-mono text-emerald-800 min-w-[70px]')}
                      {renderSortableTh('II-27', 'q2_2027', 'right', 'font-mono text-emerald-800 min-w-[70px]')}
                      {renderSortableTh('Harga \'27', 'avg2027', 'right', 'font-mono font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-200 min-w-[80px]')}

                      {/* Rasio & Aksi */}
                      {renderSortableTh('Rasio %', 'rasio', 'right', 'font-mono font-bold text-slate-900 min-w-[75px]')}
                      <th className="py-2.5 px-2 text-center w-14">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-xs">
                    {activeRespondentItems.map(item => {
                      const isHigh = item.rasio > 100;
                      const isLow = item.rasio < 80;

                      return (
                        <tr 
                          key={item.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isLow ? 'bg-rose-50/25' : isHigh && item.rasio > 120 ? 'bg-sky-50/25' : ''
                          }`}
                        >
                          {/* Nama Komoditas */}
                          <td className="py-2 px-2.5 font-sans font-medium text-slate-900">
                            <div>{item.namaKomoditas}</div>
                            <div className="text-[10px] text-slate-400 font-sans line-clamp-1">
                              {item.kualitasRekon}
                            </div>
                          </td>

                          {/* Satuan */}
                          <td className="py-2 px-1 text-center text-[11px] text-slate-600 font-sans">
                            {item.satuan}
                          </td>

                          {/* Merek */}
                          <td className="py-2 px-2 text-[11px] font-sans text-slate-600 truncate max-w-[85px]" title={item.namaMerek}>
                            {item.namaMerek || '-'}
                          </td>

                          {/* 2026 Quarters */}
                          <td className="py-2 px-2 text-right text-slate-600 border-l border-slate-100">
                            {item.q3_2025 > 0 ? formatNumber(item.q3_2025, 0) : <span className="text-slate-300">0</span>}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-600">
                            {item.q4_2025 > 0 ? formatNumber(item.q4_2025, 0) : <span className="text-slate-300">0</span>}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-600">
                            {item.q1_2026 > 0 ? formatNumber(item.q1_2026, 0) : <span className="text-slate-300">0</span>}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-600">
                            {item.q2_2026 > 0 ? formatNumber(item.q2_2026, 0) : <span className="text-slate-300">0</span>}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900 bg-slate-50 border-r border-slate-100">
                            {formatNumber(item.avg2026, 0)}
                          </td>

                          {/* 2027 Quarters */}
                          <td className="py-2 px-2 text-right text-emerald-700">
                            {item.q3_2026 > 0 ? formatNumber(item.q3_2026, 0) : <span className="text-slate-300 font-sans">-</span>}
                          </td>
                          <td className="py-2 px-2 text-right text-emerald-700">
                            {item.q4_2026 > 0 ? formatNumber(item.q4_2026, 0) : <span className="text-slate-300 font-sans">-</span>}
                          </td>
                          <td className="py-2 px-2 text-right text-emerald-700">
                            {item.q1_2027 > 0 ? formatNumber(item.q1_2027, 0) : <span className="text-slate-300 font-sans">-</span>}
                          </td>
                          <td className="py-2 px-2 text-right text-emerald-700">
                            {item.q2_2027 > 0 ? formatNumber(item.q2_2027, 0) : <span className="text-slate-300 font-sans">-</span>}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-emerald-950 bg-emerald-50/50 border-r border-emerald-100">
                            {formatNumber(item.avg2027, 0)}
                          </td>

                          {/* Rasio */}
                          <td className="py-2 px-2 text-right">
                            <span className={`inline-block px-1.5 py-0.5 rounded-xs font-bold text-xs ${
                              isLow 
                                ? 'bg-rose-100 text-rose-800' 
                                : isHigh 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-emerald-50 text-emerald-800'
                            }`}>
                              {formatNumber(item.rasio, 1)}%
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => onOpenDetail(item)}
                                title="Lihat detail responden"
                                className="p-1 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-sm"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onOpenEdit(item)}
                                title="Edit harga 2027"
                                className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-sm"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </>
          ) : (
            <div className="py-16 text-center text-slate-400">
              Pilih responden dari daftar di sebelah kiri
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
