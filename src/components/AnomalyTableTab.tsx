/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  Download,
  Percent,
  Check,
  Server
} from 'lucide-react';
import { RespondentPriceItem, QualityBrandAnomalyRow, FilterState, UserProfile } from '../types/ikk';
import { formatNumber, formatRupiah, calculateInterRespondentCV } from '../utils/csvParser';
import { QualityDetailModal } from './QualityDetailModal';

interface AnomalyTableTabProps {
  items: RespondentPriceItem[];
  kabKotaList: { kode: string; nama: string; recordCount: number }[];
  komoditasList: string[];
  kuesionerList: string[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  currentUser?: UserProfile | null;
  onRequestLogin?: (reason?: 'upload' | 'catatan' | 'general') => void;
  onOpenDetail?: (item: RespondentPriceItem) => void;
  onOpenEdit?: (item: RespondentPriceItem) => void;
  onUpdateStatus: (id: string, status: RespondentPriceItem['rekonStatus']) => void;
  onSaveNote?: (id: string, note: string) => void;
  onExportFiltered?: (filteredItems: RespondentPriceItem[]) => void;
}

type SortField = 'rasio' | 'avg2026' | 'avg2027' | 'selisih' | 'namaKab' | 'namaKomoditas' | 'namaMerek' | 'cv2027' | 'satuan' | 'rekonStatus';

export const AnomalyTableTab: React.FC<AnomalyTableTabProps> = ({
  items,
  kabKotaList,
  komoditasList,
  kuesionerList,
  filters,
  setFilters,
  currentUser,
  onRequestLogin,
  onOpenEdit,
  onUpdateStatus,
  onSaveNote
}) => {
  const [sortField, setSortField] = useState<SortField>('rasio');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [serverSaveNotification, setServerSaveNotification] = useState<string | null>(null);

  // Modal State for Quality & Brand View
  const [selectedQualityRow, setSelectedQualityRow] = useState<QualityBrandAnomalyRow | null>(null);

  // Group items to Quality & Brand level per Kabupaten/Kota
  // "tabel yg ditampilkan itu tabel kualitas dan merek yang CV (>20 %) dan rasionya mengalami anomali (rasio > 120 dan < 80) ga harus sampai level responden"
  const qualityBrandRows = useMemo<QualityBrandAnomalyRow[]>(() => {
    const map = new Map<string, RespondentPriceItem[]>();

    items.forEach(item => {
      const kabKey = item.kodeKab;
      const kualitasKey = (item.kualitasRekon || item.namaKomoditas || '').trim().toLowerCase();
      const merekKey = (item.namaMerek || '-').trim().toLowerCase();
      const groupKey = `${kabKey}_${kualitasKey}_${merekKey}`;

      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(item);
    });

    const rows: QualityBrandAnomalyRow[] = [];

    map.forEach((groupItems) => {
      const first = groupItems[0];

      // Valid prices in 2026 (Tahun Lalu)
      const valid2026 = groupItems.map(g => g.avg2026).filter(p => p > 0);
      const avg2026 = valid2026.length > 0 
        ? Math.round(valid2026.reduce((a, b) => a + b, 0) / valid2026.length) 
        : 0;

      // Valid prices in 2027 (Tahun Berjalan)
      const valid2027 = groupItems.map(g => g.avg2027).filter(p => p > 0);
      const avg2027 = valid2027.length > 0 
        ? Math.round(valid2027.reduce((a, b) => a + b, 0) / valid2027.length) 
        : 0;

      // Inter-respondent CV calculation for this quality & brand
      let cv2027 = 0;
      if (valid2027.length > 1) {
        cv2027 = calculateInterRespondentCV(valid2027).cv;
      }
      // If 0 or single respondent, check respondent's commodity cv or quarterly variation
      if (cv2027 === 0) {
        const commCv = first.cv2027 || 0;
        if (commCv > 0) {
          cv2027 = commCv;
        } else {
          const quarterly: number[] = [];
          groupItems.forEach(g => {
            [g.q3_2026, g.q4_2026, g.q1_2027, g.q2_2027].forEach(p => {
              if (p > 0) quarterly.push(p);
            });
          });
          if (quarterly.length > 1) {
            cv2027 = calculateInterRespondentCV(quarterly).cv;
          }
        }
      }

      let cv2026 = 0;
      if (valid2026.length > 1) {
        cv2026 = calculateInterRespondentCV(valid2026).cv;
      } else {
        cv2026 = first.cv2026 || 0;
      }

      // Ratio & differences
      const rasio = avg2026 > 0 ? Math.round((avg2027 / avg2026) * 10000) / 100 : (avg2027 > 0 ? 100 : 0);
      const selisih = avg2027 - avg2026;
      const growthPercent = avg2026 > 0 ? Math.round(((avg2027 - avg2026) / avg2026) * 10000) / 100 : 0;

      // Criteria specified by user: CV > 20% or Rasio > 120% or Rasio < 80%
      const isHighCv = cv2027 > 20;
      const isHighRatio = rasio > 120;
      const isLowRatio = rasio < 80;
      const isAnomaly = isHighCv || isHighRatio || isLowRatio;

      // Consolidated status
      let rekonStatus: RespondentPriceItem['rekonStatus'] = 'belum_verifikasi';
      if (groupItems.some(g => g.rekonStatus === 'perlu_konfirmasi')) {
        rekonStatus = 'perlu_konfirmasi';
      } else if (groupItems.some(g => g.rekonStatus === 'telah_diimputasi')) {
        rekonStatus = 'telah_diimputasi';
      } else if (groupItems.every(g => g.rekonStatus === 'valid_terkonfirmasi')) {
        rekonStatus = 'valid_terkonfirmasi';
      }

      const catatanRekon = groupItems.find(g => g.catatanRekon && g.catatanRekon.trim())?.catatanRekon || '';
      const updatedAt = groupItems.find(g => g.updatedAt)?.updatedAt;

      rows.push({
        id: `${first.kodeKab}_${first.kodeKualitasRekon || first.kualitasRekon}_${first.namaMerek || '-'}`,
        kodeKab: first.kodeKab,
        namaKab: first.namaKab,
        kodeKualitasRekon: first.kodeKualitasRekon || first.kualitasRekon,
        kualitasRekon: first.kualitasRekon || first.namaKomoditas,
        namaKomoditas: first.namaKomoditas,
        namaMerek: first.namaMerek || '-',
        satuan: first.satuan,
        jenisKuesioner: first.jenisKuesioner,
        avg2026,
        avg2027,
        cv2027: Math.round(cv2027 * 100) / 100,
        cv2026: Math.round(cv2026 * 100) / 100,
        rasio,
        selisih,
        growthPercent,
        isAnomaly,
        isHighRatio,
        isLowRatio,
        isHighCv,
        rekonStatus,
        catatanRekon,
        updatedAt,
        respondents: groupItems,
        respondentCount: groupItems.length
      });
    });

    return rows;
  }, [items]);

  // Handle Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter Quality & Brand Rows
  const filteredRows = useMemo(() => {
    return qualityBrandRows.filter(row => {
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchKomoditas = row.namaKomoditas.toLowerCase().includes(query) || row.kualitasRekon.toLowerCase().includes(query);
        const matchMerek = row.namaMerek.toLowerCase().includes(query);
        const matchKab = row.namaKab.toLowerCase().includes(query) || row.kodeKab.toLowerCase().includes(query);
        const matchResp = row.respondents.some(r => r.namaResp.toLowerCase().includes(query) || r.kodeResp.toLowerCase().includes(query));
        if (!matchKomoditas && !matchMerek && !matchKab && !matchResp) return false;
      }

      // Kabupaten
      if (filters.selectedKab && row.kodeKab !== filters.selectedKab) {
        return false;
      }

      // Jenis Kuesioner
      if (filters.selectedKuesioner && row.jenisKuesioner !== filters.selectedKuesioner) {
        return false;
      }

      // Komoditas
      if (filters.selectedKomoditas && row.namaKomoditas !== filters.selectedKomoditas) {
        return false;
      }

      // Status
      if (filters.statusFilter !== 'all' && row.rekonStatus !== filters.statusFilter) {
        return false;
      }

      // Ratio & CV Anomaly Filter Presets
      if (filters.ratioFilter === 'anomaly') {
        // CV > 20% OR Rasio > 120% OR Rasio < 80%
        if (!row.isAnomaly) return false;
      } else if (filters.ratioFilter === 'high_increase') {
        // Rasio > 120%
        if (row.rasio <= 120) return false;
      } else if (filters.ratioFilter === 'sharp_decrease') {
        // Rasio < 80%
        if (row.rasio >= 80) return false;
      } else if (filters.ratioFilter === 'cv_above_20' || filters.ratioFilter === 'cv_above_15' || filters.ratioFilter === 'high_cv') {
        // CV > 20%
        if (row.cv2027 <= 20) return false;
      }

      // Custom numeric range
      if (filters.minRatio !== undefined && row.rasio < filters.minRatio) {
        return false;
      }
      if (filters.maxRatio !== undefined && row.rasio > filters.maxRatio) {
        return false;
      }

      return true;
    });
  }, [qualityBrandRows, filters]);

  // Sorted Rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filteredRows, sortField, sortDirection]);

  // Paginated Rows
  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  // Quick reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      selectedKab: '',
      selectedKuesioner: '',
      selectedKomoditas: '',
      ratioFilter: 'all',
      minRatio: undefined,
      maxRatio: undefined,
      statusFilter: 'all'
    });
    setPage(1);
  };

  // Status Change with Server Persistence for all respondents in the Quality & Brand group
  const handleStatusChange = (row: QualityBrandAnomalyRow, newStatus: RespondentPriceItem['rekonStatus']) => {
    row.respondents.forEach(resp => {
      onUpdateStatus(resp.id, newStatus);
    });
    onUpdateStatus(row.id, newStatus);
    setServerSaveNotification('Status berhasil disimpan ke server');
    setTimeout(() => {
      setServerSaveNotification(null);
    }, 2800);
  };

  // Save Note & Status from QualityDetailModal
  const handleSaveModalNote = (_rowId: string, noteText: string, respondentIds: string[]) => {
    if (onSaveNote) {
      respondentIds.forEach(id => {
        onSaveNote(id, noteText);
      });
    }
  };

  const handleUpdateModalStatus = (rowId: string, newStatus: RespondentPriceItem['rekonStatus'], respondentIds: string[]) => {
    respondentIds.forEach(id => {
      onUpdateStatus(id, newStatus);
    });
    onUpdateStatus(rowId, newStatus);
  };

  // Export Data Builder (Quality & Brand Level)
  const buildExportPayload = (dataset: QualityBrandAnomalyRow[]) => {
    return dataset.map((row, idx) => ({
      'No': idx + 1,
      'Kode Kabupaten/Kota': row.kodeKab,
      'Nama Kabupaten/Kota': row.namaKab,
      'Jenis Kuesioner': row.jenisKuesioner,
      'Nama Komoditas': row.namaKomoditas,
      'Kualitas Rekon': row.kualitasRekon,
      'Nama Merek': row.namaMerek || '-',
      'Satuan Standar': row.satuan,
      'Jumlah Responden': row.respondentCount,
      
      // Harga 2026 (Tahun Lalu)
      'Harga Rata-rata 2026 (Rp)': row.avg2026,
      'CV 2026 (%)': row.cv2026,
      
      // Harga 2027 (Tahun Berjalan)
      'Harga Rata-rata 2027 (Rp)': row.avg2027,
      'CV Antar-Responden 2027 (%)': row.cv2027,
      
      // Rasio & Selisih
      'Rasio (%)': row.rasio,
      'Selisih (Rp)': row.selisih,
      'Pertumbuhan (%)': row.growthPercent,
      
      // Status & Rekon
      'Status Verifikasi': row.rekonStatus === 'valid_terkonfirmasi' 
        ? 'Valid Terkonfirmasi' 
        : row.rekonStatus === 'perlu_konfirmasi' 
          ? 'Perlu Konfirmasi Lapangan' 
          : row.rekonStatus === 'telah_diimputasi' 
            ? 'Telah Diimputasi / Disesuaikan' 
            : 'Belum Verifikasi',
      'Catatan Rekonsiliasi': row.catatanRekon || '',
      'Kategori Anomali': row.rasio > 120 
        ? 'Peningkatan (>120%)' 
        : row.rasio < 80 
          ? 'Penurunan Drastis (<80%)' 
          : row.cv2027 > 20 
            ? 'CV Tinggi (>20%)' 
            : 'Normal',
      'Terakhir Diperbarui': row.updatedAt ? new Date(row.updatedAt).toLocaleString('id-ID') : '-'
    }));
  };

  // Export Excel (.xlsx) using xlsx library
  const exportToExcel = (onlyWithNotes = false) => {
    setExportMenuOpen(false);
    let targetRows = sortedRows;
    if (onlyWithNotes) {
      targetRows = sortedRows.filter(r => (r.catatanRekon && r.catatanRekon.trim()) || r.rekonStatus !== 'belum_verifikasi');
    }
    if (targetRows.length === 0) {
      alert('Tidak ada data catatan / status verifikasi yang dapat diunduh.');
      return;
    }

    const payload = buildExportPayload(targetRows);
    const worksheet = XLSX.utils.json_to_sheet(payload);

    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 14 }, // Kode Kab
      { wch: 20 }, // Nama Kab
      { wch: 20 }, // Kuesioner
      { wch: 26 }, // Komoditas
      { wch: 28 }, // Kualitas Rekon
      { wch: 18 }, // Merek
      { wch: 14 }, // Satuan
      { wch: 16 }, // Jumlah Resp
      { wch: 18 }, // Harga 2026
      { wch: 16 }, // CV 2026
      { wch: 18 }, // Harga 2027
      { wch: 20 }, // CV 2027
      { wch: 12 }, // Rasio
      { wch: 14 }, // Selisih
      { wch: 14 }, // Pertumbuhan
      { wch: 25 }, // Status
      { wch: 35 }, // Catatan
      { wch: 22 }, // Kategori
      { wch: 22 }  // Updated at
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekon_Kualitas_Merek');
    const filename = `Catatan_Status_Rekon_Kualitas_${onlyWithNotes ? 'Terverifikasi_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // Export CSV (.csv) with UTF-8 BOM
  const exportToCsv = (onlyWithNotes = false) => {
    setExportMenuOpen(false);
    let targetRows = sortedRows;
    if (onlyWithNotes) {
      targetRows = sortedRows.filter(r => (r.catatanRekon && r.catatanRekon.trim()) || r.rekonStatus !== 'belum_verifikasi');
    }
    if (targetRows.length === 0) {
      alert('Tidak ada data catatan / status verifikasi yang dapat diunduh.');
      return;
    }

    const payload = buildExportPayload(targetRows);
    const csvContent = Papa.unparse(payload, { delimiter: ';' });
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Catatan_Status_Rekon_Kualitas_${onlyWithNotes ? 'Terverifikasi_' : ''}${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 w-full">

      {/* Floating Server Save Notification */}
      {serverSaveNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Server className="w-4 h-4 text-emerald-400" />
          <span className="font-medium">{serverSaveNotification}</span>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        </div>
      )}

      {/* Filter Bar & Clean Presets */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5 w-full">
        
        {/* Top Filter Row: Clean Presets without small subtitle note */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Filter Cepat Rasio &amp; Koefisien Variasi Rekonsiliasi</span>
              <span className="text-[11px] text-slate-500 font-normal">
                (Ditemukan: <strong className="text-slate-900 font-mono tabular-nums">{filteredRows.length.toLocaleString('id-ID')}</strong> kualitas &amp; merek)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => { setFilters(f => ({ ...f, ratioFilter: 'anomaly' })); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                filters.ratioFilter === 'anomaly'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Anomali (CV &gt; 20% / Rasio &gt; 120 / &lt; 80)</span>
            </button>

            <button
              onClick={() => { setFilters(f => ({ ...f, ratioFilter: 'high_increase' })); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                filters.ratioFilter === 'high_increase'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Peningkatan (&gt; 120%)</span>
            </button>

            <button
              onClick={() => { setFilters(f => ({ ...f, ratioFilter: 'sharp_decrease' })); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                filters.ratioFilter === 'sharp_decrease'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Penurunan (&lt; 80%)</span>
            </button>

            <button
              onClick={() => { setFilters(f => ({ ...f, ratioFilter: 'cv_above_20' })); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${
                filters.ratioFilter === 'cv_above_20' || filters.ratioFilter === 'cv_above_15' || filters.ratioFilter === 'high_cv'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>CV Antar-Resp &gt; 20%</span>
            </button>

            <button
              onClick={() => { setFilters(f => ({ ...f, ratioFilter: 'all' })); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                filters.ratioFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Kualitas &amp; Merek
            </button>
          </div>
        </div>

        {/* Search, Main Filter Selects, & Download Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              placeholder="Cari komoditas, merek, kualitas, kab/kota..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white"
            />
          </div>

          {/* Wilayah Dropdown */}
          <div className="lg:col-span-3">
            <select
              value={filters.selectedKab}
              onChange={(e) => { setFilters(f => ({ ...f, selectedKab: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white text-slate-800 font-medium"
            >
              <option value="">Semua Wilayah ({kabKotaList.length} Kab/Kota)</option>
              {kabKotaList.map(kab => (
                <option key={kab.kode} value={kab.kode}>
                  [{kab.kode}] {kab.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Jenis Kuesioner Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={filters.selectedKuesioner}
              onChange={(e) => { setFilters(f => ({ ...f, selectedKuesioner: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white text-slate-800"
            >
              <option value="">Semua Kategori</option>
              {kuesionerList.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Action Area: Filter Lain & Dedicated Unduh Catatan/Status Rekon */}
          <div className="lg:col-span-3 flex items-center gap-2 justify-end">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
                showAdvancedFilters || filters.selectedKomoditas || filters.statusFilter !== 'all' || filters.minRatio !== undefined
                  ? 'bg-sky-50 border-sky-300 text-sky-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter Lain</span>
            </button>

            {/* DEDICATED UNDUH CATATAN & STATUS REKON BUTTON WITH EXCEL / CSV DROPDOWN */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#28a745] hover:bg-[#218838] text-white rounded-lg shadow-2xs transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Catatan &amp; Status</span>
              </button>

              {exportMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setExportMenuOpen(false)} 
                  />
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-40 py-1 text-xs">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      Pilihan Unduh Dokumen Rekon
                    </div>

                    <button
                      type="button"
                      onClick={() => exportToExcel(false)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-800 flex items-center gap-2 font-medium"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div>Unduh Excel (.xlsx)</div>
                        <div className="text-[10px] text-slate-400">Seluruh data kualitas &amp; merek ({filteredRows.length})</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportToExcel(true)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-800 flex items-center gap-2 font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div>Unduh Excel (.xlsx) Catatan Saja</div>
                        <div className="text-[10px] text-slate-400">Hanya item berstatus / ada catatan</div>
                      </div>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => exportToCsv(false)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-800 flex items-center gap-2 font-medium"
                    >
                      <Download className="w-4 h-4 text-sky-600" />
                      <div>
                        <div>Unduh CSV (.csv)</div>
                        <div className="text-[10px] text-slate-400">Format teks pemisah titik-koma (BOM)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportToCsv(true)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-800 flex items-center gap-2 font-medium"
                    >
                      <Download className="w-4 h-4 text-sky-600" />
                      <div>
                        <div>Unduh CSV (.csv) Catatan Saja</div>
                        <div className="text-[10px] text-slate-400">Hanya item berstatus / ada catatan</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/60 p-3 rounded-lg">
            
            {/* Filter Komoditas */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Komoditas IKK
              </label>
              <select
                value={filters.selectedKomoditas}
                onChange={(e) => { setFilters(f => ({ ...f, selectedKomoditas: e.target.value })); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
              >
                <option value="">Semua Komoditas ({komoditasList.length})</option>
                {komoditasList.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Filter Status Rekon */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Status Verifikasi Rekon
              </label>
              <select
                value={filters.statusFilter}
                onChange={(e) => { setFilters(f => ({ ...f, statusFilter: e.target.value as any })); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
              >
                <option value="all">Semua Status</option>
                <option value="belum_verifikasi">Belum Verifikasi</option>
                <option value="valid_terkonfirmasi">Valid Terkonfirmasi</option>
                <option value="perlu_konfirmasi">Perlu Konfirmasi Lapangan</option>
                <option value="telah_diimputasi">Telah Diimputasi / Disesuaikan</option>
              </select>
            </div>

            {/* Range Rasio Kustom */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Rentang Rasio Kustom (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min %"
                  value={filters.minRatio ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                    setFilters(f => ({ ...f, minRatio: val }));
                    setPage(1);
                  }}
                  className="w-1/2 px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white font-mono"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Maks %"
                  value={filters.maxRatio ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                    setFilters(f => ({ ...f, maxRatio: val }));
                    setPage(1);
                  }}
                  className="w-1/2 px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white font-mono"
                />
                <button
                  onClick={resetFilters}
                  title="Reset filter"
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Main Data Table: Quality & Brand Level */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs w-full">
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th className="py-3 px-3.5 whitespace-nowrap min-w-[150px]">
                  <button 
                    onClick={() => handleSort('namaKab')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Kabupaten/Kota</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>

                <th className="py-3 px-3.5 whitespace-nowrap min-w-[210px]">
                  <button 
                    onClick={() => handleSort('namaKomoditas')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Komoditas / Kualitas Rekon</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>

                <th className="py-3 px-3.5 whitespace-nowrap min-w-[140px]">
                  <button 
                    onClick={() => handleSort('namaMerek')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Merek</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>

                <th className="py-3 px-3 whitespace-nowrap text-center">
                  <button 
                    onClick={() => handleSort('satuan')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Satuan</span>
                    {sortField === 'satuan' ? (
                      sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-sky-600" /> : <ArrowUp className="w-3 h-3 text-sky-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </th>

                <th className="py-3 px-3.5 whitespace-nowrap text-right">
                  <button 
                    onClick={() => handleSort('avg2026')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Harga 2026</span>
                    {sortField === 'avg2026' ? (
                      sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-sky-600" /> : <ArrowUp className="w-3 h-3 text-sky-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </th>

                <th className="py-3 px-3.5 whitespace-nowrap text-right">
                  <button 
                    onClick={() => handleSort('avg2027')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Harga 2027</span>
                    {sortField === 'avg2027' ? (
                      sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-sky-600" /> : <ArrowUp className="w-3 h-3 text-sky-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </th>

                {/* DEDICATED COLUMN: KOEFISIEN VARIASI ANTAR-RESPONDEN (CLEAN NUMBER ONLY) */}
                <th className="py-3 px-3.5 whitespace-nowrap text-right min-w-[120px]">
                  <button 
                    onClick={() => handleSort('cv2027')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 justify-end w-full"
                    title="Koefisien Variasi harga antar-responden dalam kab/kota yang sama"
                  >
                    <span>CV Antar-Resp</span>
                    {sortField === 'cv2027' ? (
                      sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : <ArrowUp className="w-3 h-3 text-purple-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </th>

                {/* DEDICATED COLUMN: RASIO % (CLEAN BADGE ONLY) */}
                <th className="py-3 px-3.5 whitespace-nowrap text-right">
                  <button 
                    onClick={() => handleSort('rasio')}
                    className="inline-flex items-center gap-1 text-slate-900 font-bold"
                  >
                    <span>Rasio %</span>
                    {sortField === 'rasio' ? (
                      sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-sky-600" /> : <ArrowUp className="w-3 h-3 text-sky-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </th>

                <th className="py-3 px-3.5 whitespace-nowrap text-center min-w-[160px]">
                  <button 
                    onClick={() => handleSort('rekonStatus')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Status Rekon (Server)</span>
                    {sortField === 'rekonStatus' ? (
                      sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-sky-600" /> : <ArrowUp className="w-3 h-3 text-sky-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </th>

                <th className="py-3 px-3.5 whitespace-nowrap text-center">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">Tidak ada data kualitas/merek yang cocok dengan filter</p>
                      <button
                        onClick={resetFilters}
                        className="text-xs text-sky-600 hover:underline font-semibold mt-1"
                      >
                        Reset semua filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isHighRatio = row.rasio > 120;
                  const isLowRatio = row.rasio < 80;
                  const isHighCv = row.cv2027 > 20;

                  return (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLowRatio ? 'bg-rose-50/20' : isHighRatio ? 'bg-sky-50/20' : isHighCv ? 'bg-purple-50/15' : ''
                      }`}
                    >
                      {/* Kabupaten/Kota */}
                      <td className="py-2.5 px-3.5 align-middle">
                        <div className="font-semibold text-slate-900 whitespace-nowrap">
                          {row.namaKab}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          [{row.kodeKab}]
                        </div>
                      </td>

                      {/* Komoditas / Kualitas Rekon */}
                      <td className="py-2.5 px-3.5 align-middle">
                        <div className="font-semibold text-slate-900 line-clamp-1" title={row.namaKomoditas}>
                          {row.namaKomoditas}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1" title={row.kualitasRekon}>
                          {row.kualitasRekon}
                        </div>
                      </td>

                      {/* Merek */}
                      <td className="py-2.5 px-3.5 align-middle">
                        <span className="font-medium text-slate-800 text-xs">
                          {row.namaMerek}
                        </span>
                      </td>

                      {/* Satuan Standar */}
                      <td className="py-2.5 px-3 align-middle text-center">
                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-xs">
                          {row.satuan}
                        </span>
                      </td>

                      {/* Rata-rata 2026 (Tahun Lalu) */}
                      <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-800">
                          {formatRupiah(row.avg2026)}
                        </div>
                      </td>

                      {/* Rata-rata 2027 (Tahun Berjalan) */}
                      <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">
                          {formatRupiah(row.avg2027)}
                        </div>
                      </td>

                      {/* CV ANTAR-RESPONDEN (CLEAN NUMBER ONLY - NO SMALL TEXT) */}
                      <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums">
                        <span className={`font-bold text-xs ${
                          isHighCv ? 'text-purple-700 font-extrabold' : 'text-slate-700'
                        }`}>
                          {formatNumber(row.cv2027, 2)}%
                        </span>
                      </td>

                      {/* RASIO % (CLEAN BADGE ONLY - NO SMALL TEXT) */}
                      <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-xs ${
                          isLowRatio 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : isHighRatio
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {formatNumber(row.rasio, 2)}%
                        </span>
                      </td>

                      {/* Status Rekon — SAVED TO SERVER ON CHANGE */}
                      <td className="py-2.5 px-3 align-middle text-center">
                        <select
                          value={row.rekonStatus}
                          onChange={(e) => handleStatusChange(row, e.target.value as any)}
                          className={`text-[11px] font-medium py-1 px-2 rounded-md border focus:outline-hidden transition-colors w-full ${
                            row.rekonStatus === 'valid_terkonfirmasi'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : row.rekonStatus === 'perlu_konfirmasi'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                                : row.rekonStatus === 'telah_diimputasi'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="belum_verifikasi">Belum Cek</option>
                          <option value="valid_terkonfirmasi">Valid ✓</option>
                          <option value="perlu_konfirmasi">Perlu Konfirmasi</option>
                          <option value="telah_diimputasi">Diimputasi</option>
                        </select>
                        {row.catatanRekon && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-[140px] truncate mx-auto text-left" title={row.catatanRekon}>
                            "{row.catatanRekon}"
                          </div>
                        )}
                      </td>

                      {/* Aksi: View Modal (Eye Icon) */}
                      <td className="py-2.5 px-3.5 align-middle text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedQualityRow(row)}
                          title="Lihat rincian harga antar-responden tahun berjalan"
                          className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 w-full">
          <div className="flex items-center gap-2">
            <span>Menampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-mono"
            >
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
            </select>
            <span>
              dari <strong className="font-mono text-slate-900">{filteredRows.length.toLocaleString('id-ID')}</strong> kualitas &amp; merek
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-500">
              Halaman {page} dari {totalPages}
            </span>
            <div className="inline-flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* View Detail Modal for Quality & Brand: Clean table of respondents for Current Year without graphs */}
      <QualityDetailModal
        row={selectedQualityRow}
        isOpen={!!selectedQualityRow}
        onClose={() => setSelectedQualityRow(null)}
        onSaveNote={handleSaveModalNote}
        onUpdateStatus={handleUpdateModalStatus}
        onOpenEditRespondent={(resp) => onOpenEdit?.(resp)}
        currentUser={currentUser}
        onRequestLogin={onRequestLogin}
      />

    </div>
  );
};
