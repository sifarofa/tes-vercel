/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RotateCcw, 
  Calendar,
  Layers,
  FileCheck,
  FileType,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { RawCsvRow } from '../types/ikk';
import { UploadMetadata } from '../utils/storage';
import { 
  isRekonnasFormat, 
  transformRekonnasToRawRows,
  getVersi1TemplateRows,
  getVersi2RekonnasTemplateRows,
  getTahunBerjalanTemplateRows,
  downloadExcelFile,
  downloadCsvFile
} from '../utils/rekonnasParser';

interface UploadDokumenModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadMeta: UploadMetadata;
  onApplyTahunBerjalan: (rows: RawCsvRow[], fileName: string, detectedQuarters: string[]) => void;
  onApplyTahunLalu: (rows: RawCsvRow[], fileName: string) => void;
  onResetToDefault: () => void;
}

export const UploadDokumenModal: React.FC<UploadDokumenModalProps> = ({
  isOpen,
  onClose,
  uploadMeta,
  onApplyTahunBerjalan,
  onApplyTahunLalu,
  onResetToDefault
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'berjalan' | 'lalu'>('lalu');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Staged rows preview
  const [stagedRows, setStagedRows] = useState<RawCsvRow[]>([]);
  const [stagedFileName, setStagedFileName] = useState<string>('');
  const [stagedQuarters, setStagedQuarters] = useState<string[]>([]);
  const [detectedFormatType, setDetectedFormatType] = useState<'versi1_horizontal' | 'versi2_rekonnas' | null>(null);
  const [stagedStats, setStagedStats] = useState<{
    totalInputRows: number;
    uniqueItems: number;
    uniqueKab: number;
    uniqueKomoditas: number;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse File (Excel or CSV)
  const handleParseFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStagedRows([]);
    setDetectedFormatType(null);
    setStagedStats(null);

    try {
      const fileName = file.name;
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.txt');

      if (!isExcel && !isCsv) {
        throw new Error('Format file tidak didukung. Harap unggah file spreadsheet Excel (.xlsx, .xls) atau CSV (.csv).');
      }

      let parsedData: any[] = [];

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        // Find sheet name matching tabel 7.1 or rekonda or rekonnas, or pick first sheet
        let targetSheetName = workbook.SheetNames[0];
        if (activeTab === 'berjalan') {
          const match = workbook.SheetNames.find(s => s.toLowerCase().includes('7.1') || s.toLowerCase().includes('berjalan'));
          if (match) targetSheetName = match;
        } else {
          const match = workbook.SheetNames.find(s => 
            s.toLowerCase().includes('rekonnas') || 
            s.toLowerCase().includes('rekonda') || 
            s.toLowerCase().includes('2026') || 
            s.toLowerCase().includes('lalu')
          );
          if (match) targetSheetName = match;
        }

        const worksheet = workbook.Sheets[targetSheetName];
        parsedData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
      } else {
        // CSV parsing with PapaParse
        const text = await file.text();
        const results = Papa.parse<any>(text, {
          header: true,
          skipEmptyLines: true,
          delimiter: text.includes(';') ? ';' : ','
        });
        parsedData = results.data;
      }

      if (!parsedData || parsedData.length === 0) {
        throw new Error('File tidak memiliki data atau baris kosong.');
      }

      // Check whether file format is Versi 2 (Rekonnas vertical format) or Versi 1 (Standard horizontal format)
      if (isRekonnasFormat(parsedData)) {
        // Versi 2: Format Rekonnas BPS (Kota;Komoditas;Kualitas Rekon;Tahun;Triwulan;Responden;Nama Responden;Harga)
        const transformed = transformRekonnasToRawRows(parsedData, activeTab);
        
        if (transformed.rawRows.length === 0) {
          throw new Error('Gagal mengonversi file Rekonnas: Tidak ada baris responden yang valid ditemukan.');
        }

        setDetectedFormatType('versi2_rekonnas');
        setStagedRows(transformed.rawRows);
        setStagedFileName(fileName);
        setStagedQuarters(transformed.detectedQuarters);
        setStagedStats(transformed.stats);
      } else {
        // Versi 1: Format Standar Rekonda (Horizontal)
        setDetectedFormatType('versi1_horizontal');
        
        // Detect quarters in uploaded horizontal data
        const firstRow = parsedData[0];
        const allKeys = Object.keys(firstRow).map(k => k.trim());

        const detectedQ: string[] = [];
        const hasQ3_26 = allKeys.some(k => /iii.*2026/i.test(k) || /q3.*2026/i.test(k));
        const hasQ4_26 = allKeys.some(k => /iv.*2026/i.test(k) || /q4.*2026/i.test(k));
        const hasQ1_27 = allKeys.some(k => /i.*2027/i.test(k) || /q1.*2027/i.test(k));
        const hasQ2_27 = allKeys.some(k => /ii.*2027/i.test(k) || /q2.*2027/i.test(k));

        if (hasQ3_26) detectedQ.push('TW III-2026');
        if (hasQ4_26) detectedQ.push('TW IV-2026');
        if (hasQ1_27) detectedQ.push('TW I-2027');
        if (hasQ2_27) detectedQ.push('TW II-2027');

        // Check for 2025/2026 columns
        if (allKeys.some(k => /iii.*2025/i.test(k))) detectedQ.push('TW III-2025');
        if (allKeys.some(k => /iv.*2025/i.test(k))) detectedQ.push('TW IV-2025');
        if (allKeys.some(k => /i.*2026/i.test(k))) detectedQ.push('TW I-2026');
        if (allKeys.some(k => /ii.*2026/i.test(k))) detectedQ.push('TW II-2026');

        setStagedRows(parsedData);
        setStagedFileName(fileName);
        setStagedQuarters(detectedQ);
        setStagedStats({
          totalInputRows: parsedData.length,
          uniqueItems: parsedData.length,
          uniqueKab: new Set(parsedData.map(r => r['Nama Kabupaten/Kota'] || r['Kode Kabupaten/Kota'])).size,
          uniqueKomoditas: new Set(parsedData.map(r => r['Nama Komoditas'])).size
        });
      }

      setIsProcessing(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat membaca file');
      setIsProcessing(false);
    }
  };

  const handleCommitStaged = () => {
    if (stagedRows.length === 0) return;

    if (activeTab === 'berjalan') {
      onApplyTahunBerjalan(stagedRows, stagedFileName, stagedQuarters);
      setSuccessMessage(`Berhasil memperbaharui ${stagedRows.length.toLocaleString('id-ID')} data harga Tahun Berjalan (Tabel 7.1).`);
    } else {
      onApplyTahunLalu(stagedRows, stagedFileName);
      setSuccessMessage(`Berhasil memperbaharui ${stagedRows.length.toLocaleString('id-ID')} data harga Tahun Lalu (Rekonda 2026).`);
    }

    setStagedRows([]);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Upload Dokumen &amp; Templat Data IKK
              </h2>
              <p className="text-[11px] text-slate-500">
                Mendukung 2 format template Tahun Lalu (Versi Rekonda Horizontal &amp; Rekonnas Vertikal) serta Tahun Berjalan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* Tab Selector: Tahun Lalu (with 2 versions) vs Tahun Berjalan */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setActiveTab('lalu');
                setStagedRows([]);
                setErrorMessage(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md transition-all text-center ${
                activeTab === 'lalu'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Data Tahun Lalu (Tersedia 2 Versi Templat)
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('berjalan');
                setStagedRows([]);
                setErrorMessage(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md transition-all text-center ${
                activeTab === 'berjalan'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Data Tahun Berjalan (Sheet Tabel 7.1)
            </button>
          </div>

          {/* Active Tab Explanation & Download Templates */}
          {activeTab === 'lalu' ? (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5 text-amber-950">
                <div className="font-semibold flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-700" />
                    <span>Basis Data Tahun Lalu (Periode: TW III-2025, IV-2025, I-2026, II-2026)</span>
                  </div>
                  <span className="text-[11px] font-normal text-amber-800">
                    Otomatis dikonversi menjadi kolom Harga 2026 &amp; penyebut Rasio IKK
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/90">
                  Anda dapat mengunggah salah satu dari <strong>2 format templat resmi</strong> di bawah ini. Jika Anda mengunggah <strong>Versi 2 (Hasil Rekonnas BPS)</strong>, sistem secara otomatis akan mem-pivot data dari format vertikal per triwulan menjadi baris responden lengkap dengan kalkulasi CV dan rata-rata.
                </p>
              </div>

              {/* 2 Template Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* Template Versi 1 */}
                <div className="border border-slate-200 rounded-lg p-3 bg-white hover:border-slate-300 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                        Versi 1: Format Standar Rekonda
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Horizontal (Per Responden)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                      Satu baris per responden komoditas dengan kolom 4 triwulan langsung:
                    </p>
                    <div className="text-[10px] font-mono text-slate-700 bg-slate-50 p-2 rounded border border-slate-200/80 mb-3 overflow-x-auto whitespace-nowrap">
                      Kode Kab · Nama Kab · Responden · Komoditas · Kualitas · Merek · III-2025 · IV-2025 · I-2026 · II-2026 · cv
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadExcelFile('Template_Tahun_Lalu_Versi1_Rekonda_Horizontal.xlsx', getVersi1TemplateRows(), 'Rekonda26')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Unduh Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCsvFile('Template_Tahun_Lalu_Versi1_Rekonda_Horizontal.csv', getVersi1TemplateRows())}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Unduh CSV (.csv)</span>
                    </button>
                  </div>
                </div>

                {/* Template Versi 2 */}
                <div className="border border-sky-200 rounded-lg p-3 bg-sky-50/30 hover:border-sky-300 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-600 inline-block"></span>
                        Versi 2: Format Hasil Rekonnas
                      </span>
                      <span className="text-[10px] text-sky-800 font-mono font-medium">Vertikal (Per Triwulan)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                      Format standar ekspor aplikasi Rekonnas BPS (seperti file <code className="text-[10px] bg-sky-100 text-sky-900 px-1 py-0.5 rounded">IKK REKONDA responden 2026.csv</code>):
                    </p>
                    <div className="text-[10px] font-mono text-sky-900 bg-white p-2 rounded border border-sky-200 mb-3 overflow-x-auto whitespace-nowrap">
                      Kota; Komoditas; Kualitas Rekon; Kualitas Data; Flag Ganti; Tahun; Triwulan; Responden; Nama Responden; Harga
                    </div>
                  </div>

                  <div className="pt-2 border-t border-sky-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadExcelFile('Template_Tahun_Lalu_Versi2_Rekonnas_Vertikal.xlsx', getVersi2RekonnasTemplateRows(), 'HasilRekonnas')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[11px] font-semibold text-sky-800 bg-sky-100 hover:bg-sky-200 border border-sky-300 rounded-md transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Unduh Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCsvFile('Template_Tahun_Lalu_Versi2_Rekonnas_Vertikal.csv', getVersi2RekonnasTemplateRows())}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Unduh CSV (.csv)</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-lg space-y-1.5 text-sky-950">
                <div className="font-semibold flex items-center justify-between text-xs text-sky-900">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-700" />
                    <span>Data Tahun Berjalan: Triwulan III-2026 s.d. II-2027 (Sheet Tabel 7.1)</span>
                  </div>
                  <span className="text-[11px] font-normal text-sky-800">
                    Kalkulasi dinamis sesuai triwulan yang sudah tersedia
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-sky-900/90">
                  Data harga tahun berjalan akan terus diperbaharui per triwulan hingga Triwulan II-2027. Jika saat ini data baru tersedia sampai <strong>Triwulan IV-2026</strong>, rata-rata tahun berjalan (kolom <strong>Harga 2027</strong>) dan CV dihitung dari triwulan yang telah terisi.
                </p>
              </div>

              {/* Template Card for Tahun Berjalan */}
              <div className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900 mb-1">
                    Templat Format Tabel 7.1 Tahun Berjalan
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 overflow-x-auto whitespace-nowrap">
                    Kode Kab · Nama Kab · Responden · Komoditas · Kualitas · Merek · III-2026 · IV-2026 · I-2027 · II-2027
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadExcelFile('Template_Tahun_Berjalan_Tabel_7.1.xlsx', getTahunBerjalanTemplateRows(), 'Tabel7.1')}
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Unduh Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCsvFile('Template_Tahun_Berjalan_Tabel_7.1.csv', getTahunBerjalanTemplateRows())}
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Unduh CSV (.csv)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Drop Zone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-sky-500 hover:bg-sky-50/20 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleParseFile(file);
              }}
              accept=".xlsx,.xls,.csv,.txt" 
              className="hidden" 
            />

            <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-sky-600 transition-colors" />
            
            <div className="text-xs font-semibold text-slate-800">
              Klik untuk memilih atau letakkan file spreadsheet {activeTab === 'lalu' ? 'Tahun Lalu (Versi 1 atau 2 Rekonnas)' : 'Tahun Berjalan (Tabel 7.1)'} di sini
            </div>
            
            <div className="text-[11px] text-slate-500">
              Mendukung file Excel BPS (.xlsx, .xls) dan file CSV delimit titik-koma (;) atau koma (,)
            </div>

            {isProcessing && (
              <div className="text-xs text-sky-600 font-semibold mt-2 animate-pulse flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses dan mendeteksi struktur kolom spreadsheet...</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold">Gagal Mengunggah Dokumen</div>
                <div>{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold">Pembaruan Berhasil</div>
                <div>{successMessage}</div>
              </div>
            </div>
          )}

          {/* Staged Data Preview & Summary */}
          {stagedRows.length > 0 && (
            <div className="space-y-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
              
              {/* Detection Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      {stagedFileName}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {detectedFormatType === 'versi2_rekonnas' ? (
                        <span className="text-sky-800 font-medium">
                          Terdeteksi: <strong>Format Versi 2 (Hasil Rekonnas BPS Vertikal)</strong> · {stagedStats?.totalInputRows.toLocaleString('id-ID')} baris triwulan berhasil diagregasi menjadi {stagedRows.length.toLocaleString('id-ID')} responden
                        </span>
                      ) : (
                        <span className="text-slate-700">
                          Terdeteksi: <strong>Format Versi 1 (Standar Horizontal)</strong> · {stagedRows.length.toLocaleString('id-ID')} responden
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto font-mono text-[10px] text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded">
                  <span>Kuartal: {stagedQuarters.length > 0 ? stagedQuarters.join(', ') : 'Lengkap 4 TW'}</span>
                </div>
              </div>

              {/* Sample 4 rows preview */}
              <div className="border border-slate-200 rounded-md overflow-x-auto bg-white max-h-48">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold sticky top-0">
                    <tr>
                      <th className="py-1.5 px-2.5">Kabupaten/Kota</th>
                      <th className="py-1.5 px-2.5">Responden</th>
                      <th className="py-1.5 px-2.5">Komoditas / Kualitas</th>
                      <th className="py-1.5 px-2 text-right">
                        {activeTab === 'lalu' ? 'TW III 2025' : 'TW III 2026'}
                      </th>
                      <th className="py-1.5 px-2 text-right">
                        {activeTab === 'lalu' ? 'TW IV 2025' : 'TW IV 2026'}
                      </th>
                      <th className="py-1.5 px-2 text-right">
                        {activeTab === 'lalu' ? 'TW I 2026' : 'TW I 2027'}
                      </th>
                      <th className="py-1.5 px-2 text-right">
                        {activeTab === 'lalu' ? 'TW II 2026' : 'TW II 2027'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {stagedRows.slice(0, 4).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="py-1.5 px-2.5 font-sans truncate max-w-[120px]">
                          {r['Nama Kabupaten/Kota'] || r['Kode Kabupaten/Kota'] || ''}
                        </td>
                        <td className="py-1.5 px-2.5 font-sans truncate max-w-[140px]">
                          {r['Nama Responden'] || r['Kode Responden'] || ''}
                        </td>
                        <td className="py-1.5 px-2.5 font-sans truncate max-w-[180px]">
                          {r['kualitas rekon'] || r['Nama Komoditas'] || ''}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">
                          {activeTab === 'lalu' 
                            ? (r['III-2025'] && r['III-2025'] !== '0' ? Number(String(r['III-2025']).replace(/,/g, '')).toLocaleString('id-ID') : '0') 
                            : (r['III-2026'] && r['III-2026'] !== '0' ? Number(String(r['III-2026']).replace(/,/g, '')).toLocaleString('id-ID') : '0')}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">
                          {activeTab === 'lalu' 
                            ? (r['IV-2025'] && r['IV-2025'] !== '0' ? Number(String(r['IV-2025']).replace(/,/g, '')).toLocaleString('id-ID') : '0') 
                            : (r['IV-2026'] && r['IV-2026'] !== '0' ? Number(String(r['IV-2026']).replace(/,/g, '')).toLocaleString('id-ID') : '0')}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">
                          {activeTab === 'lalu' 
                            ? (r['I-2026'] && r['I-2026'] !== '0' ? Number(String(r['I-2026']).replace(/,/g, '')).toLocaleString('id-ID') : '0') 
                            : (r['I-2027'] && r['I-2027'] !== '0' ? Number(String(r['I-2027']).replace(/,/g, '')).toLocaleString('id-ID') : '0')}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">
                          {activeTab === 'lalu' 
                            ? (r['II-2026'] && r['II-2026'] !== '0' ? Number(String(r['II-2026']).replace(/,/g, '')).toLocaleString('id-ID') : '0') 
                            : (r['II-2027'] && r['II-2027'] !== '0' ? Number(String(r['II-2027']).replace(/,/g, '')).toLocaleString('id-ID') : '0')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Menampilkan 4 dari {stagedRows.length.toLocaleString('id-ID')} baris data yang siap diterapkan.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStagedRows([]);
                      setDetectedFormatType(null);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md bg-white"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitStaged}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Terapkan Pembaruan Data ke Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Data Status Information */}
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-600">
            <div>
              <span className="font-bold text-slate-800">Status Sumber Data Saat Ini:</span>
              <div className="mt-0.5">
                {uploadMeta.hasCustomLalu ? (
                  <span className="text-emerald-700 font-medium">
                    Tahun Lalu: Menggunakan file {uploadMeta.laluFileName} ({uploadMeta.laluRecordCount?.toLocaleString('id-ID')} baris)
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Tahun Lalu: Database Bawaan Sheet Rekonda 2026 (6.718 baris)
                  </span>
                )}
              </div>
              <div>
                {uploadMeta.hasCustomBerjalan ? (
                  <span className="text-emerald-700 font-medium">
                    Tahun Berjalan: Menggunakan file {uploadMeta.berjalanFileName} ({uploadMeta.berjalanRecordCount?.toLocaleString('id-ID')} baris)
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Tahun Berjalan: Data Bawaan Tabel 7.1 Kalbar (Tersedia TW III &amp; TW IV 2026)
                  </span>
                )}
              </div>
            </div>

            {(uploadMeta.hasCustomBerjalan || uploadMeta.hasCustomLalu) && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Kembalikan seluruh basis data ke database bawaan Kalimantan Barat (6.718 baris)?')) {
                    onResetToDefault();
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition-colors shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Kembalikan ke Data Bawaan</span>
              </button>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Semua kalkulasi IKK dilakukan secara lokal dan disinkronkan ke server.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
