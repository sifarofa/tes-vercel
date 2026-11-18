/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { 
  Header 
} from './components/Header';
import { 
  RekonDaerahView 
} from './components/RekonDaerahView';
import { 
  AnomalyTableTab 
} from './components/AnomalyTableTab';
import { 
  RespondentExplorerTab 
} from './components/RespondentExplorerTab';
import { 
  RespondentDetailModal 
} from './components/RespondentDetailModal';
import { 
  EditPriceModal 
} from './components/EditPriceModal';
import { 
  SimulatorModal 
} from './components/SimulatorModal';
import { 
  UploadDokumenModal 
} from './components/UploadDokumenModal';
import { 
  GoogleAuthModal 
} from './components/GoogleAuthModal';
import { 
  RespondentPriceItem, 
  RegionalCommodityAggregate, 
  SummaryStats, 
  FilterState, 
  RawCsvRow,
  RekonDaerahRow,
  UserProfile 
} from './types/ikk';
import { 
  processRawRows 
} from './utils/csvParser';
import { 
  saveNote, 
  saveStatus, 
  saveManualEdit, 
  clearManualEdits, 
  getStoredDummyConfig, 
  saveDummyConfig, 
  getStoredManualEdits,
  getStoredCustomBerjalan,
  saveCustomBerjalan,
  getStoredCustomLalu,
  saveCustomLalu,
  getStoredUploadMeta,
  saveUploadMeta,
  clearAllCustomUploads,
  UploadMetadata,
  syncWithServer
} from './utils/storage';
import { getStoredUser } from './utils/auth';
import { DummyGeneratorConfig } from './utils/dummyGenerator';
import { Loader2, AlertCircle, RefreshCw, Calendar, FileSpreadsheet, Check } from 'lucide-react';

export default function App() {
  // Navigation: Rekon Daerah (default), Tabel Anomali, and Penelusuran Responden
  const [activeTab, setActiveTab] = useState<'rekonda' | 'rekon' | 'respondent'>('rekonda');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // User Authentication State (Default: Guest / Unauthenticated)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getStoredUser);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalReason, setAuthModalReason] = useState<'upload' | 'catatan' | 'general'>('general');

  const handleOpenAuthModal = useCallback((reason: 'upload' | 'catatan' | 'general' = 'general') => {
    setAuthModalReason(reason);
    setAuthModalOpen(true);
  }, []);

  // Raw rows cache so we can re-process when dummy config or manual edits change
  const [cachedRawRows, setCachedRawRows] = useState<RawCsvRow[]>([]);
  const [cachedBerjalanRows, setCachedBerjalanRows] = useState<RawCsvRow[]>([]);
  
  // Processed Data
  const [items, setItems] = useState<RespondentPriceItem[]>([]);
  const [regionalAggregates, setRegionalAggregates] = useState<RegionalCommodityAggregate[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [kabKotaList, setKabKotaList] = useState<{ kode: string; nama: string; recordCount: number }[]>([]);
  const [komoditasList, setKomoditasList] = useState<string[]>([]);
  const [kuesionerList, setKuesionerList] = useState<string[]>([]);

  // Filter State for Anomaly Table (Default to anomaly criteria: CV > 20% or Rasio > 120 / < 80)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    selectedKab: '',
    selectedKuesioner: '',
    selectedKomoditas: '',
    ratioFilter: 'anomaly',
    statusFilter: 'all'
  });

  // Modals
  const [detailModalItem, setDetailModalItem] = useState<RespondentPriceItem | null>(null);
  const [editModalItem, setEditModalItem] = useState<RespondentPriceItem | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);

  const handleOpenUploadModal = useCallback(() => {
    if (currentUser?.role !== 'owner') {
      handleOpenAuthModal('upload');
    } else {
      setUploadModalOpen(true);
    }
  }, [currentUser, handleOpenAuthModal]);

  // Config & Upload Metadata
  const [dummyConfig, setDummyConfig] = useState<DummyGeneratorConfig>(getStoredDummyConfig);
  const [hasEdits, setHasEdits] = useState<boolean>(false);
  const [uploadMeta, setUploadMeta] = useState<UploadMetadata>(getStoredUploadMeta);

  // Check if manual edits exist
  const refreshHasEdits = useCallback(() => {
    const edits = getStoredManualEdits();
    setHasEdits(Object.keys(edits).length > 0);
  }, []);

  // Initial Data Load (checks custom uploaded Tahun Lalu and Tahun Berjalan first)
  const initData = useCallback(async (cfg?: DummyGeneratorConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      // Synchronize statuses, notes, and manual edits from server first
      await syncWithServer();

      const storedCustomLalu = getStoredCustomLalu();
      const storedCustomBerjalan = getStoredCustomBerjalan();
      const currentMeta = getStoredUploadMeta();
      setUploadMeta(currentMeta);

      let rawDataToUse: RawCsvRow[] = [];

      if (storedCustomLalu && storedCustomLalu.length > 0) {
        rawDataToUse = storedCustomLalu;
      } else {
        const csvUrl = '/assets/aistudio/database_tabel_7.1_0a44d253.csv';
        const res = await fetch(csvUrl);
        if (!res.ok) {
          throw new Error(`Gagal membaca file CSV dari server (status ${res.status})`);
        }
        const text = await res.text();
        const results = Papa.parse<RawCsvRow>(text, {
          header: true,
          delimiter: ';',
          skipEmptyLines: true
        });
        rawDataToUse = results.data;
      }

      setCachedRawRows(rawDataToUse);
      if (storedCustomBerjalan && storedCustomBerjalan.length > 0) {
        setCachedBerjalanRows(storedCustomBerjalan);
      } else {
        setCachedBerjalanRows([]);
      }

      const processed = processRawRows(
        rawDataToUse, 
        cfg ?? dummyConfig, 
        storedCustomBerjalan || undefined
      );

      setItems(processed.items);
      setRegionalAggregates(processed.regionalAggregates);
      setSummary(processed.summary);
      setKabKotaList(processed.kabKotaList);
      setKomoditasList(processed.komoditasList);
      setKuesionerList(processed.kuesionerList);
      
      refreshHasEdits();
      setIsLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memuat data IKK');
      setIsLoading(false);
    }
  }, [dummyConfig, refreshHasEdits]);

  useEffect(() => {
    initData();
  }, [initData]);

  // Re-process cached rows with new edits or dummy config
  const reprocessData = useCallback((cfg?: DummyGeneratorConfig, customBerjalan?: RawCsvRow[]) => {
    if (cachedRawRows.length === 0) return;
    const berjalanToUse = customBerjalan ?? (cachedBerjalanRows.length > 0 ? cachedBerjalanRows : undefined);
    const processed = processRawRows(cachedRawRows, cfg ?? dummyConfig, berjalanToUse);
    setItems(processed.items);
    setRegionalAggregates(processed.regionalAggregates);
    setSummary(processed.summary);
    setKabKotaList(processed.kabKotaList);
    setKomoditasList(processed.komoditasList);
    setKuesionerList(processed.kuesionerList);
    refreshHasEdits();
  }, [cachedRawRows, cachedBerjalanRows, dummyConfig, refreshHasEdits]);

  // Handler: Save Note
  const handleSaveNote = (id: string, noteText: string) => {
    saveNote(id, noteText);
    reprocessData();
    setDetailModalItem(prev => prev && prev.id === id ? { ...prev, catatanRekon: noteText } : prev);
  };

  // Handler: Update Status
  const handleUpdateStatus = (id: string, newStatus: RespondentPriceItem['rekonStatus']) => {
    saveStatus(id, newStatus);
    reprocessData();
    setDetailModalItem(prev => prev && prev.id === id ? { ...prev, rekonStatus: newStatus } : prev);
  };

  // Handler: Save Price Edit from Modal
  const handleSavePriceEdit = (
    id: string, 
    edits: { q3_2026: number; q4_2026: number; q1_2027: number; q2_2027: number; catatan?: string }
  ) => {
    saveManualEdit(id, {
      ...edits,
      updatedAt: new Date().toISOString()
    });
    if (edits.catatan) {
      saveNote(id, edits.catatan);
    }
    reprocessData();
  };

  // Handler: Update Respondent Price for a single field from RekonDaerah modal
  const handleUpdateRespondentPrice = (
    itemId: string,
    field: 'q3_2026' | 'q4_2026' | 'q1_2027' | 'q2_2027' | 'q3_2025' | 'q4_2025' | 'q1_2026' | 'q2_2026',
    newPrice: number
  ) => {
    const existing = items.find(i => i.id === itemId);
    if (!existing) return;

    const edits: any = {
      q3_2026: existing.q3_2026,
      q4_2026: existing.q4_2026,
      q1_2027: existing.q1_2027,
      q2_2027: existing.q2_2027,
      updatedAt: new Date().toISOString()
    };
    edits[field] = newPrice;

    saveManualEdit(itemId, edits);
    reprocessData();
  };

  // Handler: Add new respondent price entry from RekonDaerah modal
  const handleAddRespondentPrice = (
    kodeKab: string,
    kualitasRekon: string,
    tahun: number,
    triwulan: number,
    namaResp: string,
    merek: string,
    harga: number
  ) => {
    const kabObj = kabKotaList.find(k => k.kode === kodeKab);
    const namaKab = kabObj ? kabObj.nama : 'KABUPATEN';
    
    const newRawRow: RawCsvRow = {
      'Kode Kabupaten/Kota': kodeKab,
      'Nama Kabupaten/Kota': namaKab,
      'Kode Responden': `${kodeKab}${Math.floor(100 + Math.random() * 899)}`,
      'Nama Responden': namaResp,
      'Jenis Kuesioner': 'Material Pabrikan',
      'Nama Komoditas': kualitasRekon,
      'Nama Kualitas': kualitasRekon,
      'Nama Merek': merek || 'STANDAR',
      'kualitas rekon': kualitasRekon,
      'kode kualitas rekon': kualitasRekon,
      'Satuan Standar': 'satuan',
      'III-2025': String(harga),
      'IV-2025': String(harga),
      'I-2026': String(harga),
      'II-2026': String(harga),
      'cv': '0'
    };

    const updatedRaw = [...cachedRawRows, newRawRow];
    setCachedRawRows(updatedRaw);

    const processed = processRawRows(updatedRaw, dummyConfig, cachedBerjalanRows);
    const createdItem = processed.items[processed.items.length - 1];
    if (createdItem) {
      const edits: any = {
        q3_2026: tahun === 2027 && triwulan === 3 ? harga : createdItem.q3_2026,
        q4_2026: tahun === 2027 && triwulan === 4 ? harga : createdItem.q4_2026,
        q1_2027: tahun === 2027 && triwulan === 1 ? harga : createdItem.q1_2027,
        q2_2027: tahun === 2027 && triwulan === 2 ? harga : createdItem.q2_2027,
        updatedAt: new Date().toISOString()
      };
      saveManualEdit(createdItem.id, edits);
    }

    reprocessData();
  };

  // Handler: Reset All Manual Edits
  const handleResetAllEdits = () => {
    clearManualEdits();
    initData();
  };

  // Handler: Reset to Original Default BPS Database
  const handleResetToDefaultDatabase = () => {
    clearAllCustomUploads();
    clearManualEdits();
    initData();
  };

  // Handler: Apply Uploaded Data Tahun Berjalan (Tabel 7.1)
  const handleApplyTahunBerjalan = (rows: RawCsvRow[], fileName: string, detectedQuarters: string[]) => {
    saveCustomBerjalan(rows);
    setCachedBerjalanRows(rows);
    
    const newMeta: UploadMetadata = {
      ...uploadMeta,
      hasCustomBerjalan: true,
      berjalanFileName: fileName,
      berjalanRecordCount: rows.length,
      quartersDetected: detectedQuarters,
      updatedAt: new Date().toISOString()
    };
    saveUploadMeta(newMeta);
    setUploadMeta(newMeta);

    // Reprocess with newly uploaded rows
    const processed = processRawRows(cachedRawRows, dummyConfig, rows);
    setItems(processed.items);
    setRegionalAggregates(processed.regionalAggregates);
    setSummary(processed.summary);
    setKabKotaList(processed.kabKotaList);
    setKomoditasList(processed.komoditasList);
    setKuesionerList(processed.kuesionerList);
  };

  // Handler: Apply Uploaded Data Tahun Lalu (Sheet Rekonda 2026)
  const handleApplyTahunLalu = (rows: RawCsvRow[], fileName: string) => {
    saveCustomLalu(rows);
    setCachedRawRows(rows);

    const newMeta: UploadMetadata = {
      ...uploadMeta,
      hasCustomLalu: true,
      laluFileName: fileName,
      laluRecordCount: rows.length,
      updatedAt: new Date().toISOString()
    };
    saveUploadMeta(newMeta);
    setUploadMeta(newMeta);

    // Reprocess with newly uploaded baseline rows
    const processed = processRawRows(rows, dummyConfig, cachedBerjalanRows.length > 0 ? cachedBerjalanRows : undefined);
    setItems(processed.items);
    setRegionalAggregates(processed.regionalAggregates);
    setSummary(processed.summary);
    setKabKotaList(processed.kabKotaList);
    setKomoditasList(processed.komoditasList);
    setKuesionerList(processed.kuesionerList);
  };

  // Handler: Apply Dummy Configuration
  const handleApplyDummyConfig = (newCfg: DummyGeneratorConfig) => {
    setDummyConfig(newCfg);
    saveDummyConfig(newCfg);
    reprocessData(newCfg);
  };

  // Download helper with UTF-8 BOM for Microsoft Excel
  const triggerDownload = (filename: string, csvContent: string) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Current Rekon Daerah Table View
  const handleExportCurrentTable = (rows: RekonDaerahRow[], kualitasName: string) => {
    const exportData = rows.map(r => ({
      'Kabupaten/Kota': `[${r.kodeKab}] ${r.namaKab}`,
      'Harga 2027 (Berjalan)': r.avg2027,
      'Harga TW III 2026': r.q3_2026,
      'Harga TW IV 2026': r.q4_2026,
      'Harga TW I 2027': r.q1_2027,
      'Harga TW II 2027': r.q2_2027,
      'Koefisien Variasi (%)': r.cv2027,
      'Nama Kualitas/Merk (Alternatif)': r.namaMerekUtama,
      'Catatan': r.catatan || '',
      'Harga 2026 (Lalu)': r.avg2026,
      'Rasio (%)': r.rasio,
      'Status': r.rasio > 100 ? 'Peningkatan (>100)' : r.rasio < 80 ? 'Penurunan (<80)' : 'Stabil (80-100)'
    }));

    const cleanTitle = kualitasName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const csv = Papa.unparse(exportData, { delimiter: ';' });
    triggerDownload(`RekonDaerah_${cleanTitle}_${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  // Export All Kualitas across all 14 Kab/Kota
  const handleExportAllKualitas = () => {
    const exportData = regionalAggregates.map(r => ({
      'Kode Wilayah': r.kodeKab,
      'Nama Wilayah': r.namaKab,
      'Kategori': r.jenisKuesioner,
      'Komoditas': r.namaKomoditas,
      'Kualitas Rekon': r.kualitasRekon,
      'Satuan': r.satuan,
      'Jumlah Responden': r.respCount,
      'Harga Rata-rata 2026': r.avgPrice2026,
      'Harga Rata-rata 2027': r.avgPrice2027,
      'Rasio (%)': r.rasio,
      'Pertumbuhan (%)': r.growthPercent,
      'Status': r.rasio > 100 ? 'Peningkatan (>100)' : r.rasio < 80 ? 'Penurunan (<80)' : 'Stabil (80-100)'
    }));

    const csv = Papa.unparse(exportData, { delimiter: ';' });
    triggerDownload(`Rekon_Seluruh_Kualitas_IKK_Kalbar_${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  // Export All Respondents
  const handleExportAllResponden = (dataToExport: RespondentPriceItem[] = items) => {
    const exportRows = dataToExport.map(item => ({
      'Kode Kabupaten/Kota': item.kodeKab,
      'Nama Kabupaten/Kota': item.namaKab,
      'Kode Responden': item.kodeResp,
      'Nama Responden': item.namaResp,
      'Jenis Kuesioner': item.jenisKuesioner,
      'Nama Komoditas': item.namaKomoditas,
      'Nama Kualitas': item.namaKualitas,
      'Nama Merek': item.namaMerek,
      'Kualitas Rekon': item.kualitasRekon,
      'Kode Kualitas Rekon': item.kodeKualitasRekon,
      'Satuan Standar': item.satuan,
      
      // 2026 (Tahun Lalu: Sheet Rekonda26)
      'Harga III-2025': item.q3_2025,
      'Harga IV-2025': item.q4_2025,
      'Harga I-2026': item.q1_2026,
      'Harga II-2026': item.q2_2026,
      'Rata-rata 2026': item.avg2026,
      'CV 2026 (%)': item.cv2026,
      
      // 2027 (Tahun Berjalan: Tabel 7.1)
      'Harga III-2026': item.q3_2026,
      'Harga IV-2026': item.q4_2026,
      'Harga I-2027': item.q1_2027,
      'Harga II-2027': item.q2_2027,
      'Rata-rata 2027': item.avg2027,
      'CV 2027 (%)': item.cv2027,
      
      // Rekonsiliasi
      'Rasio 2027/2026 (%)': item.rasio,
      'Selisih (Rp)': item.selisih,
      'Pertumbuhan (%)': item.growthPercent,
      'Kategori': item.rasio > 100 ? 'Peningkatan (>100)' : item.rasio < 80 ? 'Penurunan Drastis (<80)' : 'Stabil (80-100)',
      'Status Verifikasi': item.rekonStatus,
      'Catatan Rekonsiliasi': item.catatanRekon || ''
    }));

    const csvContent = Papa.unparse(exportRows, { delimiter: ';' });
    triggerDownload(`Rekon_Seluruh_Responden_IKK_Kalbar_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans w-full">
      
      {/* Top Bar Header with Clean Navigation & Upload Action */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        summary={summary}
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenUploadModal={handleOpenUploadModal}
        onOpenSimulator={() => setSimulatorOpen(true)}
        onResetEdits={handleResetAllEdits}
        onExportCsv={() => handleExportAllResponden(items)}
        hasEdits={hasEdits}
        hasCustomUploads={uploadMeta.hasCustomBerjalan || uploadMeta.hasCustomLalu}
      />

      {/* Main Content Viewport — AUTO-FIT TO SCREEN (Full Breadth) */}
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4">
        
        {/* Data Cycle & Status Notification Banner */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 mb-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="p-1 rounded-md bg-sky-50 text-sky-700 shrink-0">
              <Calendar className="w-4 h-4" />
            </span>
            <div className="leading-tight">
              <span className="font-bold text-slate-900">Siklus Data IKK Lintas Tahun:</span>
              <span className="ml-1 text-slate-600">
                Tahun Lalu (TW III, IV 2025 &amp; TW I, II 2026) vs Tahun Berjalan (TW III, IV 2026 s.d. TW II 2027)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {uploadMeta.hasCustomBerjalan ? (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-sm font-semibold">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Tabel 7.1 Kustom: {uploadMeta.berjalanFileName}</span>
              </span>
            ) : (
              <span className="font-mono text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-sm">
                Status Berjalan: Tersedia TW III &amp; TW IV 2026
              </span>
            )}

            <button
              type="button"
              onClick={handleOpenUploadModal}
              className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 underline"
            >
              Perbarui Data
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
            <div className="text-sm font-semibold text-slate-800">
              Memproses Basis Data Rekonda 2026 &amp; Menghitung Rasio 2027...
            </div>
            <p className="text-xs text-slate-500 max-w-md text-center">
              Memuat data survei harga konstruksi se-Kalimantan Barat
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center my-8 max-w-lg mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-rose-900">Gagal Memuat Data IKK</h3>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
            <button
              onClick={() => initData()}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Ready Views */}
        {!isLoading && !error && summary && (
          <div className="w-full">
            {/* View 1: REKON DAERAH (Auto-fit Screen, Auto-fit Chart, Sortable Columns, CV Recalculated) */}
            {activeTab === 'rekonda' && (
              <RekonDaerahView
                items={items}
                kabKotaList={kabKotaList}
                currentUser={currentUser}
                onRequestLogin={handleOpenAuthModal}
                onExportAllKualitas={handleExportAllKualitas}
                onExportAllResponden={() => handleExportAllResponden(items)}
                onExportCurrentTable={handleExportCurrentTable}
                onUpdateRespondentPrice={handleUpdateRespondentPrice}
                onAddRespondentPrice={handleAddRespondentPrice}
                onOpenUploadModal={handleOpenUploadModal}
              />
            )}

            {/* View 2: High-level anomaly table across all commodities */}
            {activeTab === 'rekon' && (
              <AnomalyTableTab
                items={items}
                kabKotaList={kabKotaList}
                komoditasList={komoditasList}
                kuesionerList={kuesionerList}
                filters={filters}
                setFilters={setFilters}
                currentUser={currentUser}
                onRequestLogin={handleOpenAuthModal}
                onOpenDetail={(item) => setDetailModalItem(item)}
                onOpenEdit={(item) => {
                  if (currentUser?.role !== 'owner') {
                    alert('Edit data harga hanya dapat diakses oleh Pemilik Akun (sifarofatunnisa24@gmail.com). Silakan buka Detail untuk mengisi Catatan Rekon.');
                    handleOpenAuthModal('general');
                  } else {
                    setEditModalItem(item);
                  }
                }}
                onUpdateStatus={handleUpdateStatus}
                onSaveNote={handleSaveNote}
                onExportFiltered={handleExportAllResponden}
              />
            )}

            {/* View 3: Respondent Directory down to respondent level */}
            {activeTab === 'respondent' && (
              <RespondentExplorerTab
                items={items}
                kabKotaList={kabKotaList}
                onOpenDetail={(item) => setDetailModalItem(item)}
                onOpenEdit={(item) => {
                  if (currentUser?.role !== 'owner') {
                    alert('Edit data harga hanya dapat diakses oleh Pemilik Akun (sifarofatunnisa24@gmail.com). Silakan buka Detail untuk mengisi Catatan Rekon.');
                    handleOpenAuthModal('general');
                  } else {
                    setEditModalItem(item);
                  }
                }}
              />
            )}
          </div>
        )}

      </main>

      {/* Auto-fit Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 mt-auto w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">Sistem Rekon Daerah IKK</span>
            <span className="mx-2 text-slate-300">·</span>
            <span>Provinsi Kalimantan Barat (14 Kabupaten/Kota)</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Basis: Rekonda 2026 (Tahun Lalu)</span>
            <span>vs</span>
            <span>Tabel 7.1 (Tahun Berjalan 2026/2027)</span>
          </div>
        </div>
      </footer>

      {/* Detail Modal for 8 Quarters */}
      <RespondentDetailModal
        item={detailModalItem}
        onClose={() => setDetailModalItem(null)}
        onSaveNote={handleSaveNote}
        onUpdateStatus={handleUpdateStatus}
        onOpenEdit={(item) => {
          if (currentUser?.role !== 'owner') {
            alert('Edit data harga hanya dapat diakses oleh Pemilik Akun (sifarofatunnisa24@gmail.com).');
            handleOpenAuthModal('general');
          } else {
            setEditModalItem(item);
          }
        }}
      />

      {/* Edit Price Modal */}
      <EditPriceModal
        item={editModalItem}
        onClose={() => setEditModalItem(null)}
        onSaveEdit={handleSavePriceEdit}
      />

      {/* Simulator / Dummy Calibration Modal */}
      <SimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        config={dummyConfig}
        onApplyConfig={handleApplyDummyConfig}
        onUploadCsv={(_file) => {
          setSimulatorOpen(false);
          handleOpenUploadModal();
        }}
        onResetAllEdits={handleResetAllEdits}
      />

      {/* Dedicated Upload Dokumen Modal (Excel & CSV) - Owner Exclusive */}
      <UploadDokumenModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        uploadMeta={uploadMeta}
        onApplyTahunBerjalan={handleApplyTahunBerjalan}
        onApplyTahunLalu={handleApplyTahunLalu}
        onResetToDefault={handleResetToDefaultDatabase}
      />

      {/* Google Authentication & Access Control Modal */}
      <GoogleAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={(user) => setCurrentUser(user)}
        reason={authModalReason}
      />

    </div>
  );
}
