/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { RawCsvRow } from '../types/ikk';
import { getRowValueCaseInsensitive } from './csvParser';

/**
 * Checks whether an uploaded array of rows matches the Rekonnas long-format
 * (Kota;Komoditas;Kualitas Rekon;Kualitas Data;Flag Ganti;Tahun;Triwulan;Responden;Nama Responden;Harga)
 */
export function isRekonnasFormat(rows: any[]): boolean {
  if (!rows || rows.length === 0) return false;
  const firstRow = rows[0];
  if (typeof firstRow !== 'object') return false;

  const keys = Object.keys(firstRow).map(k => k.trim().toLowerCase());
  
  // Checks for characteristic Rekonnas columns
  const hasKota = keys.some(k => k === 'kota' || k === 'nama kota' || k.includes('kota'));
  const hasKomoditas = keys.some(k => k === 'komoditas' || k.includes('komoditas'));
  const hasKualitasRekon = keys.some(k => k.includes('kualitas rekon') || k.includes('kualitas'));
  const hasTahun = keys.some(k => k === 'tahun' || k === 'thn' || k === 'year');
  const hasTriwulan = keys.some(k => k === 'triwulan' || k === 'tw' || k === 'quarter');
  const hasResponden = keys.some(k => k === 'responden' || k.includes('responden'));
  const hasHarga = keys.some(k => k === 'harga' || k.includes('harga') || k === 'price');

  // Must have vertical time columns (Tahun + Triwulan) and not already be horizontal (III-2025, TW III 2025, etc.)
  const hasHorizontalQuarters = keys.some(k => {
    const clean = k.replace(/[^a-z0-9]/g, '');
    return clean.includes('iii2025') || clean.includes('iv2025') || clean.includes('i2026') || clean.includes('ii2026') ||
           clean.includes('iii2026') || clean.includes('iv2026') || clean.includes('i2027') || clean.includes('ii2027') ||
           clean.includes('twiii2025') || clean.includes('twiv2025') || clean.includes('twi2026') || clean.includes('twii2026');
  });

  return hasKota && hasTahun && hasTriwulan && hasHarga && hasResponden && !hasHorizontalQuarters;
}

/**
 * Parses Kota string flexibly:
 * Supports:
 * - "6111 - KAYONG UTARA" (with dash)
 * - "6111 KAYONG UTARA" (without dash)
 * - "KAYONG UTARA" (name only)
 * - "6111" (code only)
 */
export function parseKotaString(val: any): { kode: string; nama: string } {
  const str = String(val || '').trim();
  if (!str) return { kode: '', nama: '' };

  // e.g. "6111 - KAYONG UTARA" or "6111 – KAYONG UTARA" or "6111: KAYONG UTARA"
  const matchWithSep = str.match(/^(\d+)\s*[-–:]\s*(.+)$/);
  if (matchWithSep) {
    return { kode: matchWithSep[1].trim(), nama: matchWithSep[2].trim() };
  }

  // e.g. "6111 KAYONG UTARA" (4 digits code followed by name, without dash)
  const matchNoDash = str.match(/^(\d{4})\s+(.+)$/);
  if (matchNoDash) {
    return { kode: matchNoDash[1].trim(), nama: matchNoDash[2].trim() };
  }

  // If digits only e.g. "6111"
  if (/^\d+$/.test(str)) {
    return { kode: str, nama: str };
  }

  // If text only e.g. "KAYONG UTARA"
  return { kode: '', nama: str };
}

/**
 * Parses Komoditas string flexibly:
 * Supports:
 * - "01 - Tanah Uruk" (with dash)
 * - "01 Tanah Uruk" (without dash)
 * - "Tanah Uruk" (name only)
 */
export function parseKomoditasString(val: any): { kode: string; nama: string } {
  const str = String(val || '').trim();
  if (!str) return { kode: '', nama: '' };

  // e.g. "01 - Tanah Uruk" or "10 - Semen Portland"
  const matchWithSep = str.match(/^(\d+)\s*[-–:]\s*(.+)$/);
  if (matchWithSep) {
    return { kode: matchWithSep[1].trim(), nama: matchWithSep[2].trim() };
  }

  // e.g. "01 Tanah Uruk"
  const matchNoDash = str.match(/^(\d{2,4})\s+(.+)$/);
  if (matchNoDash) {
    return { kode: matchNoDash[1].trim(), nama: matchNoDash[2].trim() };
  }

  return { kode: '', nama: str };
}

/**
 * Parses Kualitas Rekon pipe-delimited string cleanly without residual '-'
 */
export function parseKualitasRekonString(val: any, fallbackKomoditas: string): {
  kode: string;
  kualitas: string;
  merek: string;
  raw: string;
} {
  const str = String(val || '').trim();
  if (!str) {
    return { kode: '', kualitas: fallbackKomoditas, merek: '', raw: fallbackKomoditas };
  }

  // Format: "1001 | Portland Composite Cement (PCC) (SNI 15-7064-2004) | TIGA RODA"
  if (str.includes('|')) {
    const parts = str.split('|').map(p => p.trim());
    const kode = parts[0] || '';
    const kualitas = parts[1] || fallbackKomoditas;
    const rawMerek = parts[2] || '';
    const merek = rawMerek === '-' ? '' : rawMerek;
    return { kode, kualitas, merek, raw: str };
  }

  return { kode: '', kualitas: str, merek: '', raw: str };
}

/**
 * Infers standard unit for known IKK commodities
 */
export function inferSatuanStandar(komoditas: string): string {
  const k = (komoditas || '').toLowerCase();
  if (k.includes('cat')) return 'kg';
  if (k.includes('semen')) return 'zak (40 kg)';
  if (k.includes('tanah') || k.includes('pasir') || k.includes('batu') || k.includes('kerikil') || k.includes('kayu') || k.includes('sirtu')) return 'm3';
  if (k.includes('besi') || k.includes('baja')) return 'batang';
  if (k.includes('atap') || k.includes('seng') || k.includes('triplek') || k.includes('kaca') || k.includes('genteng')) return 'lembar';
  if (k.includes('paku')) return 'kg';
  if (k.includes('kloset') || k.includes('pompa') || k.includes('kran') || k.includes('pintu')) return 'buah';
  if (k.includes('buldozer') || k.includes('excavator') || k.includes('truck') || k.includes('roller') || k.includes('alat')) return '200 JAM';
  if (k.includes('pekerja') || k.includes('tukang') || k.includes('mandor')) return 'HOK';
  return '';
}

export function inferJenisKuesioner(komoditas: string, kode?: string): string {
  const k = komoditas.toLowerCase();
  if (
    k.includes('sewa') || 
    k.includes('upah') || 
    k.includes('alat') || 
    k.includes('truck') || 
    k.includes('excavator') || 
    k.includes('buldozer') ||
    k.includes('pekerja') ||
    k.includes('tukang') ||
    (kode && kode.startsWith('5'))
  ) {
    return 'Sewa Alat Berat dan Upah Jasa Konstruksi';
  }
  if (
    k.includes('tanah') || 
    k.includes('pasir') || 
    k.includes('batu') || 
    k.includes('kerikil') ||
    k.includes('sirtu')
  ) {
    return 'Material Non Pabrikan';
  }
  return 'Material Pabrikan';
}

export interface TransformRekonnasResult {
  rawRows: RawCsvRow[];
  detectedQuarters: string[];
  stats: {
    totalInputRows: number;
    uniqueItems: number;
    uniqueKab: number;
    uniqueKomoditas: number;
  };
}

/**
 * Transforms Rekonnas long-format rows into standard RawCsvRow format.
 * Aggregates/pivots prices by (Kabupaten + Responden + KualitasRekon) across quarters.
 */
export function transformRekonnasToRawRows(
  rows: any[],
  targetMode: 'lalu' | 'berjalan' = 'lalu'
): TransformRekonnasResult {
  const itemMap = new Map<string, RawCsvRow>();
  const detectedQuartersSet = new Set<string>();
  const uniqueKabSet = new Set<string>();
  const uniqueKomoditasSet = new Set<string>();

  rows.forEach(r => {
    const rawKota = getRowValueCaseInsensitive(r, ['Kota', 'kota', 'kabupaten', 'Nama Kabupaten/Kota']);
    const rawKomoditas = getRowValueCaseInsensitive(r, ['Komoditas', 'komoditas', 'Nama Komoditas']);
    const rawKualitasRekon = getRowValueCaseInsensitive(r, ['Kualitas Rekon', 'kualitas rekon', 'kualitas_rekon', 'Kualitas Data']);
    const rawResponden = getRowValueCaseInsensitive(r, ['Responden', 'responden', 'Kode Responden', 'id_responden']);
    const rawNamaResponden = getRowValueCaseInsensitive(r, ['Nama Responden', 'nama responden', 'nama_toko']);
    const rawTahun = getRowValueCaseInsensitive(r, ['Tahun', 'tahun', 'year', 'thn']);
    const rawTriwulan = getRowValueCaseInsensitive(r, ['Triwulan', 'triwulan', 'tw', 'quarter', 'q']);
    const rawHarga = getRowValueCaseInsensitive(r, ['Harga', 'harga', 'price', 'nilai']);

    const kota = parseKotaString(rawKota);
    const komoditas = parseKomoditasString(rawKomoditas);
    const qual = parseKualitasRekonString(rawKualitasRekon, komoditas.nama);
    const respKode = String(rawResponden || '').trim();
    const respNama = String(rawNamaResponden || '').trim();

    if (!kota.kode && !respKode && !kota.nama) return;

    uniqueKabSet.add(kota.nama || kota.kode);
    uniqueKomoditasSet.add(komoditas.nama);

    const qualKey = qual.kode || qual.raw || qual.kualitas;
    const itemKey = `${kota.kode || kota.nama}_${respKode}_${qualKey}`;

    if (!itemMap.has(itemKey)) {
      const cleanKualitasRekon = qual.kualitas 
        ? `${qual.kualitas}${qual.merek ? ' ' + qual.merek : ''}`
        : komoditas.nama;

      const cleanKodeKualitas = qual.kode 
        ? `[${qual.kode}] ${qual.kualitas || komoditas.nama}`
        : qual.raw || cleanKualitasRekon;

      itemMap.set(itemKey, {
        'Kode Kabupaten/Kota': kota.kode || kota.nama,
        'Nama Kabupaten/Kota': kota.nama || kota.kode,
        'Kode Responden': respKode,
        'Nama Responden': respNama,
        'Jenis Kuesioner': inferJenisKuesioner(komoditas.nama, qual.kode),
        'Nama Komoditas': komoditas.nama,
        'Nama Kualitas': qual.kualitas || komoditas.nama,
        'Nama Merek': qual.merek || '',
        'kualitas rekon': cleanKualitasRekon,
        'kode kualitas rekon': cleanKodeKualitas,
        'Satuan Standar': inferSatuanStandar(komoditas.nama),
        'III-2025': '0',
        'IV-2025': '0',
        'I-2026': '0',
        'II-2026': '0',
        'III-2026': '0',
        'IV-2026': '0',
        'I-2027': '0',
        'II-2027': '0'
      });
    }

    const item = itemMap.get(itemKey)!;
    const th = String(rawTahun || '').trim();
    const tw = String(rawTriwulan || '').trim();
    const cleanedHarga = String(rawHarga || '').replace(/,/g, '').trim();

    // Map quarter dynamically
    if (th === '2025' && (tw === '3' || tw.toLowerCase() === 'iii')) {
      item['III-2025'] = cleanedHarga;
      detectedQuartersSet.add('TW III-2025');
    } else if (th === '2025' && (tw === '4' || tw.toLowerCase() === 'iv')) {
      item['IV-2025'] = cleanedHarga;
      detectedQuartersSet.add('TW IV-2025');
    } else if (th === '2026' && (tw === '1' || tw.toLowerCase() === 'i')) {
      item['I-2026'] = cleanedHarga;
      detectedQuartersSet.add('TW I-2026');
    } else if (th === '2026' && (tw === '2' || tw.toLowerCase() === 'ii')) {
      item['II-2026'] = cleanedHarga;
      detectedQuartersSet.add('TW II-2026');
    } else if (th === '2026' && (tw === '3' || tw.toLowerCase() === 'iii')) {
      item['III-2026'] = cleanedHarga;
      detectedQuartersSet.add('TW III-2026');
    } else if (th === '2026' && (tw === '4' || tw.toLowerCase() === 'iv')) {
      item['IV-2026'] = cleanedHarga;
      detectedQuartersSet.add('TW IV-2026');
    } else if (th === '2027' && (tw === '1' || tw.toLowerCase() === 'i')) {
      item['I-2027'] = cleanedHarga;
      detectedQuartersSet.add('TW I-2027');
    } else if (th === '2027' && (tw === '2' || tw.toLowerCase() === 'ii')) {
      item['II-2027'] = cleanedHarga;
      detectedQuartersSet.add('TW II-2027');
    }
  });

  const rawRows = Array.from(itemMap.values());

  return {
    rawRows,
    detectedQuarters: Array.from(detectedQuartersSet),
    stats: {
      totalInputRows: rows.length,
      uniqueItems: rawRows.length,
      uniqueKab: uniqueKabSet.size,
      uniqueKomoditas: uniqueKomoditasSet.size
    }
  };
}

/**
 * Template Versi 1: Format Standar Rekonda (Horizontal)
 * Digunakan untuk basis data tahun lalu (TW III-2025, IV-2025, I-2026, II-2026)
 * Seluruh data bersih tanpa tanda strip (-) kosong.
 */
export function getVersi1TemplateRows(): Record<string, any>[] {
  return [
    {
      'Kode Kabupaten/Kota': '6101',
      'Nama Kabupaten/Kota': 'SAMBAS',
      'Kode Responden': '6101001',
      'Nama Responden': 'TB. MAJU JAYA',
      'Jenis Kuesioner': 'Material Pabrikan',
      'Nama Komoditas': 'Cat Emulsi',
      'Nama Kualitas': 'Cat Tembok Interior',
      'Nama Merek': 'AVIAN',
      'kualitas rekon': 'Cat Emulsi Cat Tembok Interior',
      'kode kualitas rekon': '[1902] Cat Emulsi Cat Tembok Interior',
      'Satuan Standar': 'kg',
      'III-2025': '130000',
      'IV-2025': '132000',
      'I-2026': '135000',
      'II-2026': '135000',
      'cv': '1.85'
    },
    {
      'Kode Kabupaten/Kota': '6111',
      'Nama Kabupaten/Kota': 'KAYONG UTARA',
      'Kode Responden': '6111015',
      'Nama Responden': 'PASIR (RIYANTO)',
      'Jenis Kuesioner': 'Material Non Pabrikan',
      'Nama Komoditas': 'Tanah Uruk',
      'Nama Kualitas': 'Tanah Biasa',
      'Nama Merek': '',
      'kualitas rekon': 'Tanah Biasa',
      'kode kualitas rekon': '[0102] Tanah Biasa',
      'Satuan Standar': 'm3',
      'III-2025': '116219',
      'IV-2025': '116219',
      'I-2026': '129132',
      'II-2026': '129132',
      'cv': '5.26'
    },
    {
      'Kode Kabupaten/Kota': '6110',
      'Nama Kabupaten/Kota': 'MELAWI',
      'Kode Responden': '6110021',
      'Nama Responden': 'TB MITRA ELEVEN',
      'Jenis Kuesioner': 'Material Pabrikan',
      'Nama Komoditas': 'Semen Portland',
      'Nama Kualitas': 'Portland Composite Cement (PCC)',
      'Nama Merek': 'TIGA RODA',
      'kualitas rekon': 'Portland Composite Cement (PCC) TIGA RODA',
      'kode kualitas rekon': '[1001] Portland Composite Cement (PCC)',
      'Satuan Standar': 'zak (40 kg)',
      'III-2025': '18600',
      'IV-2025': '18600',
      'I-2026': '19000',
      'II-2026': '19000',
      'cv': '1.05'
    },
    {
      'Kode Kabupaten/Kota': '6171',
      'Nama Kabupaten/Kota': 'PONTIANAK',
      'Kode Responden': '6171027',
      'Nama Responden': 'PT BHAKTI KARYA MANDIRI',
      'Jenis Kuesioner': 'Sewa Alat Berat dan Upah Jasa Konstruksi',
      'Nama Komoditas': 'Buldozer',
      'Nama Kualitas': 'Tenaga Mesin 100 - 150 HP',
      'Nama Merek': 'KOMATSU',
      'kualitas rekon': 'Buldozer Tenaga Mesin 100 - 150 HP',
      'kode kualitas rekon': '[5202] Buldozer Tenaga Mesin 100 - 150 HP',
      'Satuan Standar': '200 JAM',
      'III-2025': '196470000',
      'IV-2025': '196470000',
      'I-2026': '196470000',
      'II-2026': '196470000',
      'cv': '0.00'
    }
  ];
}

/**
 * Template Versi 2: Format Hasil Rekonnas (Vertikal / Per Triwulan)
 * Sesuai format standar ekspor aplikasi Rekonnas BPS.
 * Mendukung input dengan kode wilayah maupun nama langsung secara fleksibel.
 */
export function getVersi2RekonnasTemplateRows(): Record<string, any>[] {
  return [
    {
      'Kota': 'KAYONG UTARA',
      'Komoditas': 'Tanah Uruk',
      'Kualitas Rekon': '0102 | Tanah Biasa',
      'Kualitas Data': '0102 | Tanah Biasa',
      'Flag Ganti': '0',
      'Tahun': '2025',
      'Triwulan': '3',
      'Responden': '6111015',
      'Nama Responden': 'PASIR (RIYANTO)',
      'Harga': '116219'
    },
    {
      'Kota': 'KAYONG UTARA',
      'Komoditas': 'Tanah Uruk',
      'Kualitas Rekon': '0102 | Tanah Biasa',
      'Kualitas Data': '0102 | Tanah Biasa',
      'Flag Ganti': '0',
      'Tahun': '2025',
      'Triwulan': '4',
      'Responden': '6111015',
      'Nama Responden': 'PASIR (RIYANTO)',
      'Harga': '116219'
    },
    {
      'Kota': 'KAYONG UTARA',
      'Komoditas': 'Tanah Uruk',
      'Kualitas Rekon': '0102 | Tanah Biasa',
      'Kualitas Data': '0102 | Tanah Biasa',
      'Flag Ganti': '0',
      'Tahun': '2026',
      'Triwulan': '1',
      'Responden': '6111015',
      'Nama Responden': 'PASIR (RIYANTO)',
      'Harga': '129132'
    },
    {
      'Kota': 'KAYONG UTARA',
      'Komoditas': 'Tanah Uruk',
      'Kualitas Rekon': '0102 | Tanah Biasa',
      'Kualitas Data': '0102 | Tanah Biasa',
      'Flag Ganti': '0',
      'Tahun': '2026',
      'Triwulan': '2',
      'Responden': '6111015',
      'Nama Responden': 'PASIR (RIYANTO)',
      'Harga': '129132'
    },
    {
      'Kota': 'MELAWI',
      'Komoditas': 'Semen Portland',
      'Kualitas Rekon': '1001 | Portland Composite Cement (PCC) | TIGA RODA',
      'Kualitas Data': '1001 | Portland Composite Cement (PCC) | TIGA RODA',
      'Flag Ganti': '0',
      'Tahun': '2025',
      'Triwulan': '3',
      'Responden': '6110021',
      'Nama Responden': 'TB MITRA ELEVEN',
      'Harga': '18600'
    },
    {
      'Kota': 'MELAWI',
      'Komoditas': 'Semen Portland',
      'Kualitas Rekon': '1001 | Portland Composite Cement (PCC) | TIGA RODA',
      'Kualitas Data': '1001 | Portland Composite Cement (PCC) | TIGA RODA',
      'Flag Ganti': '0',
      'Tahun': '2025',
      'Triwulan': '4',
      'Responden': '6110021',
      'Nama Responden': 'TB MITRA ELEVEN',
      'Harga': '18600'
    },
    {
      'Kota': 'MELAWI',
      'Komoditas': 'Semen Portland',
      'Kualitas Rekon': '1001 | Portland Composite Cement (PCC) | TIGA RODA',
      'Kualitas Data': '1001 | Portland Composite Cement (PCC) | TIGA RODA',
      'Flag Ganti': '0',
      'Tahun': '2026',
      'Triwulan': '1',
      'Responden': '6110021',
      'Nama Responden': 'TB MITRA ELEVEN',
      'Harga': '19200'
    },
    {
      'Kota': 'MELAWI',
      'Komoditas': 'Semen Portland',
      'Kualitas Rekon': '1001 | Portland Composite Cement (PCC) | TIGA RODA',
      'Kualitas Data': '1001 | Portland Composite Cement (PCC) | TIGA RODA',
      'Flag Ganti': '0',
      'Tahun': '2026',
      'Triwulan': '2',
      'Responden': '6110021',
      'Nama Responden': 'TB MITRA ELEVEN',
      'Harga': '19200'
    }
  ];
}

/**
 * Template Format Tahun Berjalan (Tabel 7.1)
 */
export function getTahunBerjalanTemplateRows(): Record<string, any>[] {
  return [
    {
      'Kode Kabupaten/Kota': '6101',
      'Nama Kabupaten/Kota': 'SAMBAS',
      'Kode Responden': '6101001',
      'Nama Responden': 'TB. MAJU JAYA',
      'Jenis Kuesioner': 'Material Pabrikan',
      'Nama Komoditas': 'Cat Emulsi',
      'Nama Kualitas': 'Cat Tembok Interior',
      'Nama Merek': 'AVIAN',
      'kualitas rekon': 'Cat Emulsi Cat Tembok Interior',
      'kode kualitas rekon': '[1902] Cat Emulsi Cat Tembok Interior',
      'Satuan Standar': 'kg',
      'III-2026': '135000',
      'IV-2026': '138000',
      'I-2027': '',
      'II-2027': ''
    },
    {
      'Kode Kabupaten/Kota': '6111',
      'Nama Kabupaten/Kota': 'KAYONG UTARA',
      'Kode Responden': '6111015',
      'Nama Responden': 'PASIR (RIYANTO)',
      'Jenis Kuesioner': 'Material Non Pabrikan',
      'Nama Komoditas': 'Tanah Uruk',
      'Nama Kualitas': 'Tanah Biasa',
      'Nama Merek': '',
      'kualitas rekon': 'Tanah Biasa',
      'kode kualitas rekon': '[0102] Tanah Biasa',
      'Satuan Standar': 'm3',
      'III-2026': '132000',
      'IV-2026': '135000',
      'I-2027': '',
      'II-2027': ''
    }
  ];
}

/**
 * Downloads data as formatted Excel (.xlsx) file
 */
export function downloadExcelFile(filename: string, rows: Record<string, any>[], sheetName: string = 'Template'): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Downloads data as semicolon-delimited CSV file (standard for BPS Indonesian numbers)
 */
export function downloadCsvFile(filename: string, rows: Record<string, any>[]): void {
  const csvContent = Papa.unparse(rows, { delimiter: ';' });
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
