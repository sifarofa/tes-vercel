/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RawCsvRow {
  'Kode Kabupaten/Kota': string;
  'Nama Kabupaten/Kota': string;
  'Kode Responden': string;
  'Nama Responden': string;
  'Jenis Kuesioner': string;
  'Nama Komoditas': string;
  'Nama Kualitas': string;
  'Nama Merek': string;
  'kualitas rekon': string;
  'kode kualitas rekon': string;
  'Satuan Standar': string;
  'III-2025'?: string;
  'IV-2025'?: string;
  'I-2026'?: string;
  'II-2026'?: string;
  // Year 2027 fields (if uploaded via Tabel 7.1)
  'III-2026'?: string;
  'IV-2026'?: string;
  'I-2027'?: string;
  'II-2027'?: string;
  'cv'?: string;
  [key: string]: any;
}

export interface RespondentQuarterEntry {
  id: string;
  itemId: string;
  kodeKab: string;
  namaKab: string;
  kodeResp: string;
  namaResp: string;
  namaMerek: string;
  kualitasRekon: string;
  satuan: string;
  tahun: number; // 2026 (Tahun Lalu) or 2027 (Tahun Berjalan)
  triwulan: number; // 1, 2, 3, 4
  periodeKey: string;
  harga: number;
}

export interface RespondentPriceItem {
  id: string; // unique hash
  kodeKab: string;
  namaKab: string;
  kodeResp: string;
  namaResp: string;
  jenisKuesioner: string;
  namaKomoditas: string;
  namaKualitas: string;
  namaMerek: string;
  kualitasRekon: string;
  kodeKualitasRekon: string;
  satuan: string;
  
  // Data Tahun Lalu (Sheet Rekonda26): TW III-2025, IV-2025, I-2026, II-2026
  q3_2025: number;
  q4_2025: number;
  q1_2026: number;
  q2_2026: number;
  avg2026: number; // Rata-rata Tahun Lalu
  cv2026: number;  // Koefisien Variasi harga antar-responden dalam kab/kota untuk komoditas bersangkutan tahun lalu (2026)
  
  // Data Tahun Berjalan (Tabel 7.1): TW III-2026, IV-2026, I-2027, II-2027
  q3_2026: number;
  q4_2026: number;
  q1_2027: number;
  q2_2027: number;
  avg2027: number; // Rata-rata Tahun Berjalan (dihitung dari triwulan yang tersedia > 0)
  cv2027: number;  // Koefisien Variasi harga antar-responden dalam kab/kota untuk komoditas bersangkutan tahun berjalan (2027)
  interRespondentCv?: number; // Alias representasi CV antar-responden
  availableQuartersCount2027: number; // Jumlah triwulan berjalan yang sudah terkumpul
  
  // Perbandingan & Rasio Rekonsiliasi
  rasio: number; // (avg2027 / avg2026) * 100
  selisih: number; // avg2027 - avg2026
  growthPercent: number; // ((avg2027 - avg2026) / avg2026) * 100
  
  // Flag Anomali
  anomalyCategory: 'high_increase' | 'sharp_decrease' | 'moderate_increase' | 'stable' | 'zero_price' | 'high_cv';
  isAnomaly: boolean; // rasio > 100 or rasio < 80 or zero_price
  
  // Status Rekon
  rekonStatus: 'belum_verifikasi' | 'valid_terkonfirmasi' | 'perlu_konfirmasi' | 'telah_diimputasi';
  catatanRekon?: string;
  updatedAt?: string;
}

export interface RekonDaerahRow {
  kodeKab: string;
  namaKab: string;
  kualitasRekon: string;
  kodeKualitasRekon: string;
  satuan: string;
  namaMerekUtama: string;
  
  // Rata-rata per triwulan di tingkat Kabupaten (Tahun Berjalan 2027)
  q3_2026: number; // Harga TW III 2026
  q4_2026: number; // Harga TW IV 2026
  q1_2027: number; // Harga TW I 2027
  q2_2027: number; // Harga TW II 2027
  
  // Harga Tahun Berjalan (merujuk ke kolom Harga 2027)
  avg2027: number;
  
  // Koefisien Variasi: Variasi harga antar responden dalam wilayah yang sama!
  cv2027: number;
  
  // Harga Tahun Lalu (merujuk ke kolom Harga 2026 dari sheet Rekonda26)
  avg2026: number;
  
  // Rasio = (Harga 2027 / Harga 2026) * 100
  rasio: number;
  
  isHighlighted: boolean; // highlighted in yellow or pink if anomali / manual flag
  isManualFlag: boolean;
  catatan?: string;
  
  respondentCount: number;
  respondents: RespondentPriceItem[];
}

export interface RegionalCommodityAggregate {
  kodeKab: string;
  namaKab: string;
  kodeKualitasRekon: string;
  kualitasRekon: string;
  namaKomoditas: string;
  satuan: string;
  jenisKuesioner: string;
  respCount: number;
  
  avgPrice2026: number;
  avgPrice2027: number;
  cv2026?: number;
  cv2027?: number;
  rasio: number;
  growthPercent: number;
  hasHighIncrease: boolean; // rasio > 100
  hasSharpDecrease: boolean; // rasio < 80
  
  respondents: RespondentPriceItem[];
}

export interface SummaryStats {
  totalRecords: number;
  totalKabKota: number;
  totalResponden: number;
  totalKomoditas: number;
  countRasioHigh: number; // > 100
  countRasioLow: number;  // < 80
  countNormal: number;    // 80 - 100
  countZeroPrice: number;
  countHighCv: number;
  avgRasioProvinsi: number;
}

export interface QualityBrandAnomalyRow {
  id: string;
  kodeKab: string;
  namaKab: string;
  kodeKualitasRekon: string;
  kualitasRekon: string;
  namaKomoditas: string;
  namaMerek: string;
  satuan: string;
  jenisKuesioner: string;
  
  avg2026: number;
  avg2027: number;
  cv2027: number;
  cv2026: number;
  rasio: number;
  selisih: number;
  growthPercent: number;
  
  isAnomaly: boolean;
  isHighRatio: boolean;
  isLowRatio: boolean;
  isHighCv: boolean;
  
  rekonStatus: 'belum_verifikasi' | 'valid_terkonfirmasi' | 'perlu_konfirmasi' | 'telah_diimputasi';
  catatanRekon?: string;
  updatedAt?: string;
  
  respondents: RespondentPriceItem[];
  respondentCount: number;
}

export interface FilterState {
  search: string;
  selectedKab: string;
  selectedKuesioner: string;
  selectedKomoditas: string;
  ratioFilter: 'all' | 'anomaly' | 'high_increase' | 'sharp_decrease' | 'cv_above_20' | 'cv_above_15' | 'stable' | 'high_cv' | 'has_zero';
  minRatio?: number;
  maxRatio?: number;
  statusFilter: 'all' | 'belum_verifikasi' | 'valid_terkonfirmasi' | 'perlu_konfirmasi' | 'telah_diimputasi';
}

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  role: 'owner' | 'contributor';
  loginMethod: 'google';
  loginAt: string;
}

export const OWNER_EMAIL = 'sifarofatunnisa24@gmail.com';

