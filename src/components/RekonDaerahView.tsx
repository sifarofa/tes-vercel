/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Info, 
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { 
  RespondentPriceItem, 
  RekonDaerahRow,
  UserProfile
} from '../types/ikk';
import { formatNumber, calculateInterRespondentCV } from '../utils/csvParser';
import { GrafikRekonda } from './GrafikRekonda';
import { DetailRekondaModal } from './DetailRekondaModal';
import { 
  getStoredKabFlags, 
  toggleKabFlag, 
  getStoredKabNotes, 
  saveKabNote 
} from '../utils/storage';

interface RekonDaerahViewProps {
  items: RespondentPriceItem[];
  kabKotaList: { kode: string; nama: string; recordCount: number }[];
  currentUser?: UserProfile | null;
  onRequestLogin?: (reason?: 'upload' | 'catatan' | 'general') => void;
  onOpenGlobalEdit?: (item: RespondentPriceItem) => void;
  onExportAllKualitas: () => void;
  onExportAllResponden: () => void;
  onExportCurrentTable: (rows: RekonDaerahRow[], kualitasName: string) => void;
  onUpdateRespondentPrice: (itemId: string, field: 'q3_2026' | 'q4_2026' | 'q1_2027' | 'q2_2027' | 'q3_2025' | 'q4_2025' | 'q1_2026' | 'q2_2026', newPrice: number) => void;
  onAddRespondentPrice: (kodeKab: string, kualitasRekon: string, tahun: number, triwulan: number, namaResp: string, merek: string, harga: number) => void;
  onOpenUploadModal?: () => void;
}

type SortField = 
  | 'kodeKab' 
  | 'avg2027' 
  | 'q3_2026' 
  | 'q4_2026' 
  | 'q1_2027' 
  | 'q2_2027' 
  | 'cv2027' 
  | 'namaMerekUtama' 
  | 'catatan' 
  | 'avg2026' 
  | 'rasio';

export const RekonDaerahView: React.FC<RekonDaerahViewProps> = ({
  items,
  kabKotaList,
  currentUser,
  onRequestLogin,
  onExportAllKualitas,
  onExportAllResponden,
  onExportCurrentTable,
  onUpdateRespondentPrice,
  onAddRespondentPrice
}) => {
  // Build distinct list of Kualitas Rekon
  const kualitasOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    
    items.forEach(item => {
      const key = item.kodeKualitasRekon || item.kualitasRekon;
      if (!map.has(key)) {
        const merekPart = item.namaMerek && item.namaMerek !== 'LAINNYA' ? ` (${item.namaMerek.toUpperCase()})` : '';
        const satuanPart = item.satuan ? ` ${item.satuan.toUpperCase()}` : '';
        let cleanKualitas = (item.kualitasRekon || item.namaKomoditas).toUpperCase();
        
        let displayLabel = cleanKualitas;
        if (cleanKualitas.startsWith('[')) {
          displayLabel = `${cleanKualitas}${merekPart}${satuanPart}`;
        } else {
          const codeMatch = item.kodeKualitasRekon.match(/\[([0-9]+)\]/);
          const code = codeMatch ? `[${codeMatch[1]}] ` : '';
          displayLabel = `${code}${item.namaKomoditas.toUpperCase()} - ${cleanKualitas}${merekPart}${satuanPart}`;
        }

        map.set(key, {
          key,
          label: displayLabel,
          count: 0
        });
      }
      map.get(key)!.count++;
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  // Selected Kualitas Rekon Index & Key
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const currentKualitas = kualitasOptions[selectedIndex] || kualitasOptions[0];

  // Table pagination & search
  const [pageSize, setPageSize] = useState<number>(50);
  const [searchTable, setSearchTable] = useState('');
  const [filterAnomaliOnly, setFilterAnomaliOnly] = useState(false);

  // Sorting State for every column
  const [sortField, setSortField] = useState<SortField>('kodeKab');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedKabForModal, setSelectedKabForModal] = useState<{ kode: string; nama: string } | null>(null);

  // Read stored flags and notes
  const [flagsVersion, setFlagsVersion] = useState(0);
  const storedFlags = useMemo(() => getStoredKabFlags(), [flagsVersion]);
  const storedNotes = useMemo(() => getStoredKabNotes(), [flagsVersion]);

  // Build the 14 Kabupaten/Kota rows for the currently selected Kualitas Rekon
  // EXACT RECALCULATION OF KOEFISIEN VARIASI & CURRENT YEAR AVERAGE:
  // "di kolom koefisien rasio yang per kab/kota itu merujuk pada variasi harga antar responden dalam wilayah sama jadi tolong rekalkulasi penghitungannya"
  // "rata-rata tahun berjalan itu merujuk ke kolom Harga 2027 nantinya"
  const currentRekonRows: RekonDaerahRow[] = useMemo(() => {
    if (!currentKualitas) return [];

    const kKey = currentKualitas.key;

    return kabKotaList.map(kab => {
      // Find all respondent items in this Kab for this kualitas
      const matched = items.filter(
        i => i.kodeKab === kab.kode && (i.kodeKualitasRekon === kKey || i.kualitasRekon === kKey)
      );

      // 2027 Quarters (III-2026, IV-2026, I-2027, II-2027)
      const validQ3_27 = matched.map(m => m.q3_2026).filter(v => v > 0);
      const q3_2026 = validQ3_27.length > 0 ? validQ3_27.reduce((a, b) => a + b, 0) / validQ3_27.length : 0;

      const validQ4_27 = matched.map(m => m.q4_2026).filter(v => v > 0);
      const q4_2026 = validQ4_27.length > 0 ? validQ4_27.reduce((a, b) => a + b, 0) / validQ4_27.length : 0;

      const validQ1_27 = matched.map(m => m.q1_2027).filter(v => v > 0);
      const q1_2027 = validQ1_27.length > 0 ? validQ1_27.reduce((a, b) => a + b, 0) / validQ1_27.length : 0;

      const validQ2_27 = matched.map(m => m.q2_2027).filter(v => v > 0);
      const q2_2027 = validQ2_27.length > 0 ? validQ2_27.reduce((a, b) => a + b, 0) / validQ2_27.length : 0;

      // Base year average (Harga 2026 from sheet Rekonda26)
      const validAvg26 = matched.map(m => m.avg2026).filter(v => v > 0);
      const avg2026 = validAvg26.length > 0 ? validAvg26.reduce((a, b) => a + b, 0) / validAvg26.length : 0;

      // Variasi Harga Antar Responden dalam Wilayah Sama:
      // Each respondent has an avg2027 (Harga 2027) calculated from their available quarters.
      const respondentPrices2027 = matched.map(m => m.avg2027).filter(p => p > 0);
      let { mean: calculatedAvg2027, cv: calculatedCv2027 } = calculateInterRespondentCV(respondentPrices2027);

      // If only 1 respondent in 2027 or cv is 0, check all detail observations:
      // (e.g. Sambas Tanah Uruk where price varies between 58rb and 102rb across quarters)
      if (calculatedCv2027 === 0) {
        const allDetailPrices: number[] = [];
        matched.forEach(m => {
          [m.q3_2025, m.q4_2025, m.q1_2026, m.q2_2026, m.q3_2026, m.q4_2026, m.q1_2027, m.q2_2027].forEach(p => {
            if (p > 0) allDetailPrices.push(p);
          });
        });
        if (allDetailPrices.length > 1) {
          const detailCvRes = calculateInterRespondentCV(allDetailPrices);
          if (detailCvRes.cv > 0) {
            calculatedCv2027 = detailCvRes.cv;
            if (calculatedAvg2027 === 0) {
              calculatedAvg2027 = detailCvRes.mean;
            }
          }
        }
      }

      const avg2027 = calculatedAvg2027;
      const cv2027 = calculatedCv2027;

      // Rasio = (Harga 2027 / Harga 2026) * 100
      const rasio = avg2026 > 0 ? (avg2027 / avg2026) * 100 : (avg2027 > 0 ? 100 : 0);

      // Merek yang paling banyak muncul di kab/kota bersangkutan (modus merek)
      const brandCounts = new Map<string, number>();
      matched.forEach(m => {
        const b = (m.namaMerek || '').trim();
        if (b && b !== '-' && b.toUpperCase() !== 'LAINNYA') {
          brandCounts.set(b, (brandCounts.get(b) || 0) + 1);
        }
      });

      let mostFrequentBrand = '';
      let maxBrandCount = 0;
      brandCounts.forEach((count, brand) => {
        if (count > maxBrandCount) {
          maxBrandCount = count;
          mostFrequentBrand = brand;
        }
      });

      if (!mostFrequentBrand) {
        const fallback = matched.find(m => m.namaMerek && m.namaMerek !== '-' && m.namaMerek.toUpperCase() !== 'LAINNYA')?.namaMerek 
          || matched.find(m => m.namaMerek && m.namaMerek !== '-')?.namaMerek 
          || matched[0]?.namaMerek 
          || matched[0]?.namaKualitas 
          || '-';
        mostFrequentBrand = fallback;
      }

      // Check if flagged or highlighted
      const flagKey = `${kKey}_${kab.kode}`;
      const isManual = !!storedFlags[flagKey];
      
      const isSevereAnomaly = (rasio < 80 || rasio > 100) && avg2026 > 0;
      const isHighlighted = isManual || isSevereAnomaly || (avg2026 > 0 && avg2027 === 0);

      const catatan = storedNotes[flagKey] || matched[0]?.catatanRekon || '';

      return {
        kodeKab: kab.kode,
        namaKab: kab.nama,
        kualitasRekon: currentKualitas.label,
        kodeKualitasRekon: kKey,
        satuan: matched[0]?.satuan || '',
        namaMerekUtama: mostFrequentBrand,
        q3_2026: Math.round(q3_2026),
        q4_2026: Math.round(q4_2026),
        q1_2027: Math.round(q1_2027),
        q2_2027: Math.round(q2_2027),
        avg2027: Math.round(avg2027),
        cv2027: Math.round(cv2027 * 100) / 100,
        avg2026: Math.round(avg2026),
        rasio: Math.round(rasio * 100) / 100,
        isHighlighted,
        isManualFlag: isManual,
        catatan,
        respondentCount: matched.length,
        respondents: matched
      };
    });
  }, [currentKualitas, kabKotaList, items, storedFlags, storedNotes]);

  // Filtered and Sorted rows
  const sortedTableRows = useMemo(() => {
    let filtered = currentRekonRows.filter(row => {
      if (filterAnomaliOnly && !row.isHighlighted) return false;
      if (searchTable) {
        const q = searchTable.toLowerCase();
        return row.namaKab.toLowerCase().includes(q) || 
               row.kodeKab.includes(q) || 
               row.namaMerekUtama.toLowerCase().includes(q) ||
               String(row.avg2027).includes(q) ||
               String(row.rasio).includes(q);
      }
      return true;
    });

    return filtered.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return sortDirection === 'asc' ? (valA - valB) : (valB - valA);
    });
  }, [currentRekonRows, searchTable, filterAnomaliOnly, sortField, sortDirection]);

  const paginatedTableRows = useMemo(() => {
    return sortedTableRows.slice(0, pageSize);
  }, [sortedTableRows, pageSize]);

  // Navigation: Sebelumnya & Selanjutnya
  const handlePrevKualitas = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNextKualitas = () => {
    if (selectedIndex < kualitasOptions.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  // Open detail modal for specific Kab/Kota
  const handleOpenDetailModal = (row: RekonDaerahRow) => {
    setSelectedKabForModal({ kode: row.kodeKab, nama: row.namaKab });
    setDetailModalOpen(true);
  };

  // Toggle mark for the open modal kab
  const handleToggleMarkModal = () => {
    if (!selectedKabForModal || !currentKualitas) return;
    toggleKabFlag(currentKualitas.key, selectedKabForModal.kode);
    setFlagsVersion(v => v + 1);
  };

  // Save catatan from modal
  const handleSaveCatatanModal = (noteText: string) => {
    if (!selectedKabForModal || !currentKualitas) return;
    saveKabNote(currentKualitas.key, selectedKabForModal.kode, noteText);
    setFlagsVersion(v => v + 1);
  };

  // Active respondents for modal
  const activeModalRespondents = useMemo(() => {
    if (!selectedKabForModal || !currentKualitas) return [];
    return items.filter(
      i => i.kodeKab === selectedKabForModal.kode && 
           (i.kodeKualitasRekon === currentKualitas.key || i.kualitasRekon === currentKualitas.key)
    );
  }, [items, selectedKabForModal, currentKualitas]);

  const activeModalRow = useMemo(() => {
    if (!selectedKabForModal) return null;
    return currentRekonRows.find(r => r.kodeKab === selectedKabForModal.kode) || null;
  }, [currentRekonRows, selectedKabForModal]);

  // Helper to render sortable header
  const renderSortableHeader = (
    label: string, 
    field: SortField, 
    align: 'left' | 'right' | 'center' = 'left',
    minWidthClass: string = ''
  ) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`py-2.5 px-2.5 border-r border-slate-300 select-none cursor-pointer hover:bg-slate-200/80 transition-colors ${minWidthClass} ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
        title={`Urutkan berdasarkan ${label}`}
      >
        <div className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'} w-full`}>
          <span>{label}</span>
          <span className="shrink-0 text-slate-500">
            {isSorted ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-3 h-3 text-sky-700" />
              ) : (
                <ArrowDown className="w-3 h-3 text-sky-700" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-4 w-full">

      {/* Main Container Card - AUTO-FIT TO SCREEN */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden w-full">
        
        {/* Card Header Banner: EXACT CRIMSON/RED AS SCREENSHOT */}
        <div className="bg-[#d82b54] px-5 py-3.5 flex items-center justify-between text-white">
          <h1 className="font-bold text-base tracking-wide">
            Rekon Daerah
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-sm font-mono">
              IKK Kalbar 2026/2027
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 space-y-4 w-full">
          
          {/* Top Form Controls */}
          <div className="space-y-2.5 pb-3 border-b border-slate-100">
            
            {/* Row 1: Dropdown Provinsi & Kualitas Rekon + Tampilkan + Unduh Excel Seluruh Kualitas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
              
              {/* Dropdown Provinsi */}
              <div className="lg:col-span-3">
                <select 
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-sm bg-white font-medium text-slate-800"
                  defaultValue="61"
                >
                  <option value="61">[61] KALIMANTAN BARAT</option>
                  <option value="62">[62] KALIMANTAN TENGAH</option>
                </select>
              </div>

              {/* Dropdown Kualitas Rekon */}
              <div className="lg:col-span-5">
                <select
                  value={currentKualitas?.key || ''}
                  onChange={(e) => {
                    const idx = kualitasOptions.findIndex(o => o.key === e.target.value);
                    if (idx >= 0) setSelectedIndex(idx);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-sm bg-white font-semibold text-slate-900"
                >
                  {kualitasOptions.map(opt => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons: Tampilkan (blue) & Unduh Excel Seluruh Kualitas (green) */}
              <div className="lg:col-span-4 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {}}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-[#007bff] hover:bg-[#0069d9] rounded-sm flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Tampilkan</span>
                </button>

                <button
                  type="button"
                  onClick={onExportAllKualitas}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-[#28a745] hover:bg-[#218838] rounded-sm flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Excel Seluruh Kualitas</span>
                </button>
              </div>

            </div>

            {/* Row 2: Sebelumnya, Counter e.g. 4/52, Selanjutnya, Unduh Excel Seluruh Responden */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedIndex <= 0}
                  onClick={handlePrevKualitas}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-900 bg-[#ffc107] hover:bg-[#e0a800] rounded-sm disabled:opacity-40 shadow-2xs transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                <span className="text-xs font-mono font-bold text-slate-800 px-3 py-1">
                  {selectedIndex + 1}/{kualitasOptions.length}
                </span>

                <button
                  type="button"
                  disabled={selectedIndex >= kualitasOptions.length - 1}
                  onClick={handleNextKualitas}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-900 bg-[#ffc107] hover:bg-[#e0a800] rounded-sm disabled:opacity-40 shadow-2xs transition-colors flex items-center gap-1"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={onExportAllResponden}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#28a745] hover:bg-[#218838] rounded-sm flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Excel Seluruh Responden</span>
              </button>

            </div>

          </div>

          {/* Table Action Bar: Excel, Cetak, Tampilkan entri, Cari */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 pt-1">
            
            {/* Left: Excel, Cetak, & entries dropdown */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onExportCurrentTable(sortedTableRows, currentKualitas?.label || 'Rekon')}
                className="px-3 py-1 bg-[#6c757d] hover:bg-[#5a6268] text-white rounded-xs font-bold text-xs shadow-2xs"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1 bg-[#6c757d] hover:bg-[#5a6268] text-white rounded-xs font-bold text-xs shadow-2xs flex items-center gap-1"
              >
                <Printer className="w-3 h-3" />
                <span>Cetak</span>
              </button>

              <div className="flex items-center gap-1 ml-3">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-0.5 border border-slate-300 rounded-xs bg-white text-xs font-mono"
                >
                  <option value={10}>10</option>
                  <option value={14}>14</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entri</span>
              </div>
            </div>

            {/* Right: Anomaly Highlight Filter & Search box */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFilterAnomaliOnly(!filterAnomaliOnly)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xs text-[11px] font-bold border transition-colors ${
                  filterAnomaliOnly 
                    ? 'bg-[#f7b2b7] text-rose-900 border-rose-400 shadow-2xs' 
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title="Hanya tampilkan kabupaten yang ditandai atau memiliki rasio > 100 atau < 80"
              >
                <AlertTriangle className="w-3 h-3 text-rose-700" />
                <span>Filter Baris Anomali (&gt; 100 / &lt; 80)</span>
              </button>

              <div className="flex items-center gap-1.5">
                <span>Cari:</span>
                <input
                  type="text"
                  value={searchTable}
                  onChange={(e) => setSearchTable(e.target.value)}
                  placeholder="Ketik untuk mencari..."
                  className="px-2.5 py-0.5 border border-slate-300 rounded-xs text-xs bg-white w-36 sm:w-48"
                />
              </div>
            </div>

          </div>

          {/* REKON DAERAH TABLE WITH SORTING ON EVERY COLUMN */}
          <div className="border border-slate-300 rounded-xs overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold text-[11px]">
                  {renderSortableHeader('Kabupaten', 'kodeKab', 'left', 'min-w-[170px]')}
                  {renderSortableHeader('Harga 2027', 'avg2027', 'right', 'min-w-[95px]')}
                  {renderSortableHeader('Harga TW III 2026', 'q3_2026', 'right', 'min-w-[95px]')}
                  {renderSortableHeader('Harga TW IV 2026', 'q4_2026', 'right', 'min-w-[95px]')}
                  {renderSortableHeader('Harga TW I 2027', 'q1_2027', 'right', 'min-w-[95px]')}
                  {renderSortableHeader('Harga TW II 2027', 'q2_2027', 'right', 'min-w-[95px]')}
                  {renderSortableHeader('Koefisien Variasi', 'cv2027', 'right', 'min-w-[100px]')}
                  {renderSortableHeader('Nama Kualitas/ Merk (Alternatif)', 'namaMerekUtama', 'left', 'min-w-[150px]')}
                  {renderSortableHeader('Catatan', 'catatan', 'center', 'w-16')}
                  {renderSortableHeader('Harga 2026', 'avg2026', 'right', 'min-w-[90px]')}
                  {renderSortableHeader('Rasio', 'rasio', 'right', 'min-w-[75px]')}
                  <th className="py-2.5 px-2.5 text-center w-14">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 font-mono tabular-nums text-xs">
                {paginatedTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400 font-sans">
                      Tidak ada kabupaten yang memenuhi kriteria
                    </td>
                  </tr>
                ) : (
                  paginatedTableRows.map((row) => {
                    const isHighlighted = row.isHighlighted;
                    const isSevereAnomaly = (row.rasio < 80 || row.rasio > 100);

                    return (
                      <tr 
                        key={row.kodeKab}
                        className={`transition-colors ${
                          isHighlighted 
                            ? (isSevereAnomaly ? 'bg-[#f7b2b7] hover:bg-[#f39ea5] text-slate-900 font-medium' : 'bg-[#f9c851] hover:bg-[#f6bd3b] text-slate-900 font-medium')
                            : 'bg-white hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {/* Kabupaten/Kota: [6101] SAMBAS */}
                        <td className="py-2.5 px-3 border-r border-slate-300/80 font-sans font-semibold">
                          [{row.kodeKab}] {row.namaKab}
                        </td>

                        {/* Harga 2027 / Current Year Average */}
                        <td className="py-2.5 px-3 border-r border-slate-300/80 text-right font-bold text-slate-900">
                          {formatNumber(row.avg2027, 0)}
                        </td>

                        {/* Harga TW III 2026 */}
                        <td className="py-2.5 px-2.5 border-r border-slate-300/80 text-right">
                          {row.q3_2026 > 0 ? formatNumber(row.q3_2026, 0) : <span className="text-slate-400 font-sans">-</span>}
                        </td>

                        {/* Harga TW IV 2026 */}
                        <td className="py-2.5 px-2.5 border-r border-slate-300/80 text-right">
                          {row.q4_2026 > 0 ? formatNumber(row.q4_2026, 0) : <span className="text-slate-400 font-sans">-</span>}
                        </td>

                        {/* Harga TW I 2027 */}
                        <td className="py-2.5 px-2.5 border-r border-slate-300/80 text-right">
                          {row.q1_2027 > 0 ? formatNumber(row.q1_2027, 0) : <span className="text-slate-400 font-sans">-</span>}
                        </td>

                        {/* Harga TW II 2027 */}
                        <td className="py-2.5 px-2.5 border-r border-slate-300/80 text-right">
                          {row.q2_2027 > 0 ? formatNumber(row.q2_2027, 0) : <span className="text-slate-400 font-sans">-</span>}
                        </td>

                        {/* Koefisien Variasi (Antar Responden dalam Wilayah Sama) */}
                        <td className="py-2.5 px-2.5 border-r border-slate-300/80 text-right font-semibold">
                          {formatNumber(row.cv2027, 2)}%
                        </td>

                        {/* Nama Kualitas/Merk (Alternatif) */}
                        <td className="py-2.5 px-3 border-r border-slate-300/80 font-sans truncate max-w-[150px]" title={row.namaMerekUtama}>
                          {row.namaMerekUtama}
                        </td>

                        {/* Catatan (Blue info icon if note exists) */}
                        <td className="py-2.5 px-2 border-r border-slate-300/80 text-center">
                          {row.catatan ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(row)}
                              title={row.catatan}
                              className="w-5 h-5 rounded-full bg-[#007bff] text-white inline-flex items-center justify-center hover:bg-sky-700 shadow-2xs"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Harga 2026 / Previous Year (Sheet Rekonda26) */}
                        <td className="py-2.5 px-3 border-r border-slate-300/80 text-right">
                          {formatNumber(row.avg2026, 0)}
                        </td>

                        {/* Rasio (e.g. 105,27 or 54,19) */}
                        <td className="py-2.5 px-3 border-r border-slate-300/80 text-right font-bold">
                          <span className={row.rasio > 100 ? 'text-amber-900 font-extrabold' : row.rasio < 80 ? 'text-rose-900 font-extrabold' : ''}>
                            {formatNumber(row.rasio, 2)}
                          </span>
                        </td>

                        {/* Aksi: Blue eye button */}
                        <td className="py-2.5 px-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(row)}
                            title="Buka Detail Rekonda"
                            className="w-6 h-6 rounded-full bg-[#007bff] hover:bg-[#0069d9] text-white inline-flex items-center justify-center shadow-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 pt-1">
            <div>
              Menampilkan 1 sampai {paginatedTableRows.length} dari {sortedTableRows.length} entri (Klik pada judul kolom manapun untuk mengurutkan)
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-[11px] text-slate-500 mr-2 font-sans">
                Urutan aktif: <strong>{sortField}</strong> ({sortDirection.toUpperCase()})
              </span>
              <button
                disabled
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-sm bg-white text-slate-400 cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <span className="px-2.5 py-1 text-xs bg-[#007bff] text-white font-bold rounded-sm">
                1
              </span>
              <button
                disabled
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-sm bg-white text-slate-400 cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>

          {/* DYNAMIC GRAFIK REKONDA LINKED TO TABLE SORTING (AUTO-FIT) */}
          <div className="pt-2 w-full">
            <GrafikRekonda
              rows={sortedTableRows}
              kualitasRekonTitle={currentKualitas?.label || ''}
              sortField={sortField}
              sortDirection={sortDirection}
              onSelectKab={(kodeKab) => {
                const targetRow = sortedTableRows.find(r => r.kodeKab === kodeKab) || currentRekonRows.find(r => r.kodeKab === kodeKab);
                if (targetRow) handleOpenDetailModal(targetRow);
              }}
            />
          </div>

        </div>

      </div>

      {/* DETAIL REKONDA MODAL */}
      <DetailRekondaModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        currentUser={currentUser}
        onRequestLogin={onRequestLogin}
        kodeKab={selectedKabForModal?.kode || ''}
        namaKab={selectedKabForModal?.nama || ''}
        kualitasRekon={currentKualitas?.label || ''}
        kodeKualitasRekon={currentKualitas?.key || ''}
        isMarked={!!activeModalRow?.isHighlighted}
        onToggleMark={handleToggleMarkModal}
        catatan={activeModalRow?.catatan || ''}
        onSaveCatatan={handleSaveCatatanModal}
        respondents={activeModalRespondents}
        onUpdatePriceEntry={onUpdateRespondentPrice}
        onAddQuarterEntry={(tahun, triwulan, namaResp, merek, harga) => {
          if (!selectedKabForModal || !currentKualitas) return;
          onAddRespondentPrice(
            selectedKabForModal.kode, 
            currentKualitas.key, 
            tahun, 
            triwulan, 
            namaResp, 
            merek, 
            harga
          );
        }}
      />

    </div>
  );
};
