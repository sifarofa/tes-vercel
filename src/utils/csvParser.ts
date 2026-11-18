/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Papa from 'papaparse';
import { 
  RawCsvRow, 
  RespondentPriceItem, 
  RegionalCommodityAggregate, 
  SummaryStats 
} from '../types/ikk';
import { generate2027Quarters, DummyGeneratorConfig } from './dummyGenerator';
import { getStoredManualEdits, getStoredNotes, getStoredStatus } from './storage';

export function parseIndonesianNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (!str || str === '-' || str === 'NA' || str === 'null') return 0;
  const cleaned = str.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatRupiah(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return 'Rp 0';
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

export function formatNumber(val: number, decimals: number = 2): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Number(val).toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Calculates Koefisien Variasi (CV) across respondents in the same Kabupaten/Kota.
 * Formula: (Sample Standard Deviation / Regional Mean) * 100%
 */
export function calculateInterRespondentCV(prices: number[]): { mean: number; cv: number } {
  const valid = prices.filter(p => p > 0);
  if (valid.length === 0) {
    return { mean: 0, cv: 0 };
  }
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  if (valid.length === 1 || mean === 0) {
    return { mean: Math.round(mean), cv: 0 };
  }
  const variance = valid.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / (valid.length - 1);
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;
  return { 
    mean: Math.round(mean), 
    cv: Math.round(cv * 100) / 100 
  };
}

/**
 * Calculates respondent average for current year (2027) based only on available quarters.
 * If data is only available up to TW IV 2026, averages only TW III & TW IV 2026.
 */
export function calculateAvailableQuartersAvg(quarters: number[]): { avg: number; count: number } {
  const valid = quarters.filter(q => q > 0);
  if (valid.length === 0) return { avg: 0, count: 0 };
  const sum = valid.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / valid.length),
    count: valid.length
  };
}

export function getRowValueCaseInsensitive(row: Record<string, any>, possibleKeys: string[]): any {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  // Try case-insensitive and normalized search
  const rowKeys = Object.keys(row);
  for (const target of possibleKeys) {
    const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedKey = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget);
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
      return row[matchedKey];
    }
  }
  return undefined;
}

export function processRawRows(
  rawRows: RawCsvRow[],
  dummyConfig?: DummyGeneratorConfig,
  customTahunBerjalanRows?: RawCsvRow[]
): {
  items: RespondentPriceItem[];
  regionalAggregates: RegionalCommodityAggregate[];
  summary: SummaryStats;
  kabKotaList: { kode: string; nama: string; recordCount: number }[];
  komoditasList: string[];
  kuesionerList: string[];
} {
  const manualEdits = getStoredManualEdits();
  const storedNotes = getStoredNotes();
  const storedStatuses = getStoredStatus();

  // Create lookup for uploaded custom Tahun Berjalan data (Tabel 7.1)
  const berjalanLookup = new Map<string, RawCsvRow>();
  if (customTahunBerjalanRows && customTahunBerjalanRows.length > 0) {
    customTahunBerjalanRows.forEach(row => {
      const kKab = String(getRowValueCaseInsensitive(row, ['Kode Kabupaten/Kota', 'kode_kab', 'kode_kabkota', 'kabupaten']) || '').trim();
      const kResp = String(getRowValueCaseInsensitive(row, ['Kode Responden', 'kode_resp', 'id_responden', 'responden']) || '').trim();
      const kKualitas = String(getRowValueCaseInsensitive(row, ['kode kualitas rekon', 'kualitas rekon', 'kualitas', 'nama kualitas']) || '').trim();
      
      if (kKab && kResp) {
        const key = `${kKab}_${kResp}_${kKualitas}`;
        berjalanLookup.set(key, row);
        // Also secondary lookup without kualitas in case kualitas label slightly differs
        berjalanLookup.set(`${kKab}_${kResp}`, row);
      }
    });
  }

  const items: RespondentPriceItem[] = [];

  rawRows.forEach((row, idx) => {
    const kodeKab = String(getRowValueCaseInsensitive(row, ['Kode Kabupaten/Kota', 'kode_kab', 'kode_kabkota', 'kabupaten']) || '').trim();
    const namaKab = String(getRowValueCaseInsensitive(row, ['Nama Kabupaten/Kota', 'nama_kab', 'nama_kabkota', 'nama_kabupaten']) || '').trim();
    if (!kodeKab || !namaKab) return;

    const kodeResp = String(getRowValueCaseInsensitive(row, ['Kode Responden', 'kode_resp', 'id_responden']) || '').trim();
    const namaResp = String(getRowValueCaseInsensitive(row, ['Nama Responden', 'nama_resp', 'nama_toko']) || '').trim();
    const jenisKuesioner = String(getRowValueCaseInsensitive(row, ['Jenis Kuesioner', 'jenis_kuesioner', 'kuesioner', 'kategori']) || 'Material Pabrikan').trim();
    const namaKomoditas = String(getRowValueCaseInsensitive(row, ['Nama Komoditas', 'komoditas', 'nama_barang']) || '').trim();
    const namaKualitas = String(getRowValueCaseInsensitive(row, ['Nama Kualitas', 'kualitas', 'nama_kualitas']) || '').trim();
    const namaMerek = String(getRowValueCaseInsensitive(row, ['Nama Merek', 'merek', 'merk']) || '').trim();
    const kualitasRekon = String(getRowValueCaseInsensitive(row, ['kualitas rekon', 'kualitas_rekon']) || namaKualitas || namaKomoditas).trim();
    const kodeKualitasRekon = String(getRowValueCaseInsensitive(row, ['kode kualitas rekon', 'kode_kualitas_rekon']) || kualitasRekon).trim();
    const satuan = String(getRowValueCaseInsensitive(row, ['Satuan Standar', 'satuan', 'satuan_standar', 'unit']) || '').trim();

    // Data Tahun Lalu (Sheet Rekonda26): TW III-2025, IV-2025, I-2026, II-2026
    const q3_2025 = parseIndonesianNumber(getRowValueCaseInsensitive(row, ['III-2025', 'TW III 2025', 'III_2025', 'Q3-2025']));
    const q4_2025 = parseIndonesianNumber(getRowValueCaseInsensitive(row, ['IV-2025', 'TW IV 2025', 'IV_2025', 'Q4-2025']));
    const q1_2026 = parseIndonesianNumber(getRowValueCaseInsensitive(row, ['I-2026', 'TW I 2026', 'I_2026', 'Q1-2026']));
    const q2_2026 = parseIndonesianNumber(getRowValueCaseInsensitive(row, ['II-2026', 'TW II 2026', 'II_2026', 'Q2-2026']));

    const valid2026 = [q3_2025, q4_2025, q1_2026, q2_2026].filter(v => v > 0);
    const avg2026 = valid2026.length > 0 
      ? Math.round(valid2026.reduce((a, b) => a + b, 0) / valid2026.length) 
      : 0;


    // Unique stable ID
    const id = `${kodeKab}_${kodeResp}_${kodeKualitasRekon.replace(/[^a-zA-Z0-9]/g, '')}_${idx}`;

    // Check if custom uploaded Tahun Berjalan row exists
    const lookupKey = `${kodeKab}_${kodeResp}_${kodeKualitasRekon}`;
    const uploadedBerjalan = berjalanLookup.get(lookupKey) || berjalanLookup.get(`${kodeKab}_${kodeResp}`);

    let q3_2026 = 0;
    let q4_2026 = 0;
    let q1_2027 = 0;
    let q2_2027 = 0;

    if (uploadedBerjalan) {
      // Look for Year 2026/2027 quarters
      q3_2026 = parseIndonesianNumber(getRowValueCaseInsensitive(uploadedBerjalan, ['III-2026', 'TW III 2026', 'Harga TW III 2026', 'III_2026', 'Q3-2026']));
      q4_2026 = parseIndonesianNumber(getRowValueCaseInsensitive(uploadedBerjalan, ['IV-2026', 'TW IV 2026', 'Harga TW IV 2026', 'IV_2026', 'Q4-2026']));
      q1_2027 = parseIndonesianNumber(getRowValueCaseInsensitive(uploadedBerjalan, ['I-2027', 'TW I 2027', 'Harga TW I 2027', 'I_2027', 'Q1-2027']));
      q2_2027 = parseIndonesianNumber(getRowValueCaseInsensitive(uploadedBerjalan, ['II-2027', 'TW II 2027', 'Harga TW II 2027', 'II_2027', 'Q2-2027']));
    } else {
      // 2027 Quarters based on config
      const dummy = generate2027Quarters(
        id,
        [q3_2025, q4_2025, q1_2026, q2_2026],
        avg2026,
        dummyConfig
      );
      q3_2026 = dummy.q3_2026;
      q4_2026 = dummy.q4_2026;
      q1_2027 = dummy.q1_2027;
      q2_2027 = dummy.q2_2027;
    }

    // Apply manual edits if present
    const edit = manualEdits[id];
    if (edit?.q3_2026 !== undefined) q3_2026 = edit.q3_2026;
    if (edit?.q4_2026 !== undefined) q4_2026 = edit.q4_2026;
    if (edit?.q1_2027 !== undefined) q1_2027 = edit.q1_2027;
    if (edit?.q2_2027 !== undefined) q2_2027 = edit.q2_2027;

    // Calculate current year average strictly from available quarters (> 0)
    const { avg: avg2027, count: availableQuartersCount2027 } = calculateAvailableQuartersAvg([
      q3_2026, q4_2026, q1_2027, q2_2027
    ]);

    // Initial placeholder for CV (will be overwritten by inter-respondent CV below)
    const cv2026 = 0;
    const cv2027 = 0;

    // Calculate Ratio & Differences
    const rasio = avg2026 > 0 ? (avg2027 / avg2026) * 100 : (avg2027 > 0 ? 100 : 0);
    const selisih = avg2027 - avg2026;
    const growthPercent = avg2026 > 0 ? ((avg2027 - avg2026) / avg2026) * 100 : 0;

    const rekonStatus = storedStatuses[id] || 'belum_verifikasi';
    const catatanRekon = storedNotes[id] || edit?.catatan || '';

    items.push({
      id,
      kodeKab,
      namaKab,
      kodeResp,
      namaResp,
      jenisKuesioner,
      namaKomoditas,
      namaKualitas,
      namaMerek,
      kualitasRekon,
      kodeKualitasRekon,
      satuan,
      q3_2025,
      q4_2025,
      q1_2026,
      q2_2026,
      avg2026: Math.round(avg2026),
      cv2026,
      q3_2026,
      q4_2026,
      q1_2027,
      q2_2027,
      avg2027: Math.round(avg2027),
      cv2027,
      interRespondentCv: cv2027,
      availableQuartersCount2027,
      rasio: Math.round(rasio * 100) / 100,
      selisih: Math.round(selisih),
      growthPercent: Math.round(growthPercent * 100) / 100,
      anomalyCategory: 'stable',
      isAnomaly: false,
      rekonStatus,
      catatanRekon,
      updatedAt: edit?.updatedAt
    });
  });

  // Group by (Kabupaten + Kualitas Rekon) to compute INTER-RESPONDENT CV:
  // "koefisien variasi itu merupakan koefisien variasi harga antar responden di setiap kab/kota untuk setiap komoditasnya"
  const regionalMap = new Map<string, RespondentPriceItem[]>();

  items.forEach(item => {
    const key = `${item.kodeKab}_${item.kodeKualitasRekon || item.kualitasRekon || item.namaKomoditas}`;
    if (!regionalMap.has(key)) {
      regionalMap.set(key, []);
    }
    regionalMap.get(key)!.push(item);
  });

  // Calculate Inter-Respondent CV for each Kab/Kota and Commodity group
  regionalMap.forEach((groupItems) => {
    // Collect prices of all respondents in this Kab/Kota for this commodity
    const prices2026 = groupItems.map(g => g.avg2026).filter(p => p > 0);
    const prices2027 = groupItems.map(g => g.avg2027).filter(p => p > 0);

    let cvResult2026 = calculateInterRespondentCV(prices2026);
    let cvResult2027 = calculateInterRespondentCV(prices2027);

    // If only 1 respondent in 2027 or cv is 0, check all detail observations:
    // (e.g. Sambas Tanah Uruk where price varies between 58rb and 102rb across quarters)
    if (cvResult2027.cv === 0) {
      const allDetailPrices: number[] = [];
      groupItems.forEach(item => {
        [item.q3_2025, item.q4_2025, item.q1_2026, item.q2_2026, item.q3_2026, item.q4_2026, item.q1_2027, item.q2_2027].forEach(p => {
          if (p > 0) allDetailPrices.push(p);
        });
      });
      if (allDetailPrices.length > 1) {
        const detailCvRes = calculateInterRespondentCV(allDetailPrices);
        if (detailCvRes.cv > 0) {
          cvResult2027 = {
            mean: cvResult2027.mean || detailCvRes.mean,
            cv: detailCvRes.cv
          };
        }
      }
    }

    if (cvResult2026.cv === 0) {
      const detailPrices26: number[] = [];
      groupItems.forEach(item => {
        [item.q3_2025, item.q4_2025, item.q1_2026, item.q2_2026].forEach(p => {
          if (p > 0) detailPrices26.push(p);
        });
      });
      if (detailPrices26.length > 1) {
        const d26Res = calculateInterRespondentCV(detailPrices26);
        if (d26Res.cv > 0) {
          cvResult2026 = {
            mean: cvResult2026.mean || d26Res.mean,
            cv: d26Res.cv
          };
        }
      }
    }

    groupItems.forEach(item => {
      item.cv2026 = cvResult2026.cv;
      item.cv2027 = cvResult2027.cv;
      item.interRespondentCv = cvResult2027.cv;

      // Classify Anomaly according to official Rekon rules
      const hasZero = item.avg2026 === 0 || item.avg2027 === 0 || [item.q3_2025, item.q4_2025, item.q1_2026, item.q2_2026].some(p => p === 0);
      
      if (hasZero) {
        item.anomalyCategory = 'zero_price';
        item.isAnomaly = true;
      } else if (item.rasio < 80) {
        item.anomalyCategory = 'sharp_decrease';
        item.isAnomaly = true;
      } else if (item.rasio > 100) {
        item.anomalyCategory = 'high_increase';
        item.isAnomaly = true;
      } else if (item.cv2027 > 15 || item.cv2026 > 15) {
        item.anomalyCategory = 'high_cv';
        item.isAnomaly = true;
      } else {
        item.anomalyCategory = 'stable';
        item.isAnomaly = false;
      }
    });
  });

  const regionalAggregates: RegionalCommodityAggregate[] = [];

  regionalMap.forEach((respItems) => {
    if (respItems.length === 0) return;
    const first = respItems[0];
    
    // Regional average 2026 across respondents
    const validAvg2026 = respItems.map(r => r.avg2026).filter(v => v > 0);
    const avgPrice2026 = validAvg2026.length > 0 
      ? Math.round(validAvg2026.reduce((a, b) => a + b, 0) / validAvg2026.length)
      : 0;

    // Regional average 2027 across respondents
    const validAvg2027 = respItems.map(r => r.avg2027).filter(v => v > 0);
    const avgPrice2027 = validAvg2027.length > 0 
      ? Math.round(validAvg2027.reduce((a, b) => a + b, 0) / validAvg2027.length)
      : 0;

    const rasio = avgPrice2026 > 0 ? (avgPrice2027 / avgPrice2026) * 100 : (avgPrice2027 > 0 ? 100 : 0);
    const growthPercent = avgPrice2026 > 0 ? ((avgPrice2027 - avgPrice2026) / avgPrice2026) * 100 : 0;

    regionalAggregates.push({
      kodeKab: first.kodeKab,
      namaKab: first.namaKab,
      kodeKualitasRekon: first.kodeKualitasRekon,
      kualitasRekon: first.kualitasRekon,
      namaKomoditas: first.namaKomoditas,
      satuan: first.satuan,
      jenisKuesioner: first.jenisKuesioner,
      respCount: respItems.length,
      avgPrice2026,
      avgPrice2027,
      cv2026: first.cv2026,
      cv2027: first.cv2027,
      rasio: Math.round(rasio * 100) / 100,
      growthPercent: Math.round(growthPercent * 100) / 100,
      hasHighIncrease: rasio > 100,
      hasSharpDecrease: rasio < 80,
      respondents: respItems
    });
  });

  // Calculate Summary Stats
  const kabKotaMap = new Map<string, { kode: string; nama: string; recordCount: number }>();
  const komoditasSet = new Set<string>();
  const kuesionerSet = new Set<string>();
  const respSet = new Set<string>();

  let countRasioHigh = 0;
  let countRasioLow = 0;
  let countNormal = 0;
  let countZeroPrice = 0;
  let countHighCv = 0;
  let totalRasioSum = 0;
  let validRasioCount = 0;

  items.forEach(item => {
    if (!kabKotaMap.has(item.kodeKab)) {
      kabKotaMap.set(item.kodeKab, { kode: item.kodeKab, nama: item.namaKab, recordCount: 0 });
    }
    kabKotaMap.get(item.kodeKab)!.recordCount++;

    komoditasSet.add(item.namaKomoditas);
    kuesionerSet.add(item.jenisKuesioner);
    respSet.add(`${item.kodeKab}_${item.kodeResp}`);

    if (item.q3_2025 === 0 || item.q4_2025 === 0 || item.q1_2026 === 0 || item.q2_2026 === 0) {
      countZeroPrice++;
    }

    if (item.cv2026 > 15 || item.cv2027 > 15) {
      countHighCv++;
    }

    if (item.rasio > 100) {
      countRasioHigh++;
    } else if (item.rasio < 80) {
      countRasioLow++;
    } else {
      countNormal++;
    }

    if (item.avg2026 > 0 && item.avg2027 > 0) {
      totalRasioSum += item.rasio;
      validRasioCount++;
    }
  });

  const kabKotaList = Array.from(kabKotaMap.values()).sort((a, b) => a.kode.localeCompare(b.kode));
  const komoditasList = Array.from(komoditasSet).sort();
  const kuesionerList = Array.from(kuesionerSet).sort();

  const summary: SummaryStats = {
    totalRecords: items.length,
    totalKabKota: kabKotaList.length,
    totalResponden: respSet.size,
    totalKomoditas: komoditasList.length,
    countRasioHigh,
    countRasioLow,
    countNormal,
    countZeroPrice,
    countHighCv,
    avgRasioProvinsi: validRasioCount > 0 ? Math.round((totalRasioSum / validRasioCount) * 100) / 100 : 100
  };

  return {
    items,
    regionalAggregates,
    summary,
    kabKotaList,
    komoditasList,
    kuesionerList
  };
}

export async function loadDefaultIkkData(
  config?: DummyGeneratorConfig,
  customBerjalanRows?: RawCsvRow[]
) {
  const csvUrl = '/assets/aistudio/database_tabel_7.1_0a44d253.csv';
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Gagal memuat file CSV: status ${response.status}`);
  }
  const text = await response.text();
  
  return new Promise<ReturnType<typeof processRawRows>>((resolve, reject) => {
    Papa.parse<RawCsvRow>(text, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const processed = processRawRows(results.data, config, customBerjalanRows);
          resolve(processed);
        } catch (err) {
          reject(err);
        }
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}
