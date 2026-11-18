/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DummyGeneratorConfig {
  seed?: number;
  pctHighIncrease?: number; // percentage of items with Rasio > 100 (default ~35%)
  pctSharpDecrease?: number; // percentage of items with Rasio < 80 (default ~20%)
  baseInflation?: number; // default slight positive inflation factor
  allowZeroQuarters?: boolean;
  quartersAvailable?: 1 | 2 | 3 | 4; // 2 = up to TW IV-2026; 4 = up to TW II-2027
}

// Simple seeded pseudo-random number generator (Mulberry32)
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function roundToRealisticUnit(val: number, basePrice: number): number {
  if (val <= 0) return 0;
  if (basePrice >= 10_000_000) {
    return Math.round(val / 50_000) * 50_000;
  }
  if (basePrice >= 100_000) {
    return Math.round(val / 500) * 500;
  }
  if (basePrice >= 1_000) {
    return Math.round(val / 50) * 50;
  }
  return Math.round(val);
}

/**
 * Generate quarters for Year 2027 (III-2026, IV-2026, I-2027, II-2027)
 * based on Year 2026 prices, with realistic price ratios.
 * If data is only available up to TW IV 2026 (quartersAvailable = 2),
 * I-2027 and II-2027 are set to 0.
 */
export function generate2027Quarters(
  itemId: string,
  basePrices: [number, number, number, number],
  avg2026: number,
  config?: DummyGeneratorConfig
): {
  q3_2026: number;
  q4_2026: number;
  q1_2027: number;
  q2_2027: number;
  avg2027: number;
  cv2027: number;
} {
  const seed = (config?.seed ?? 202701) + stringToSeed(itemId);
  const rng = mulberry32(seed);

  // If base average is 0, return zeros
  if (avg2026 <= 0) {
    return {
      q3_2026: 0,
      q4_2026: 0,
      q1_2027: 0,
      q2_2027: 0,
      avg2027: 0,
      cv2027: 0
    };
  }

  const pHigh = config?.pctHighIncrease ?? 0.36; // 36% chance ratio > 100
  const pLow = config?.pctSharpDecrease ?? 0.22;  // 22% chance ratio < 80

  const dice = rng();
  let targetRatio: number;

  if (dice < pLow) {
    // Sharp decrease: ratio < 80% (between 0.50 and 0.79)
    targetRatio = 0.50 + rng() * 0.29;
  } else if (dice < pLow + pHigh) {
    // Increase: ratio > 100% (between 1.01 and 1.55)
    const surgeFactor = rng();
    if (surgeFactor < 0.75) {
      targetRatio = 1.01 + rng() * 0.24;
    } else {
      targetRatio = 1.25 + rng() * 0.35;
    }
  } else {
    // Normal/Stable: ratio 80% - 100% (0.81 to 0.995)
    targetRatio = 0.81 + rng() * 0.185;
  }

  const targetAvg = avg2026 * targetRatio;

  // Quarterly jitter around target
  const j1 = 1 + (rng() - 0.5) * 0.08;
  const j2 = 1 + (rng() - 0.5) * 0.08;
  const j3 = 1 + (rng() - 0.5) * 0.08;
  const j4 = 1 + (rng() - 0.5) * 0.08;

  let q3_2026 = roundToRealisticUnit(targetAvg * j1, avg2026);
  let q4_2026 = roundToRealisticUnit(targetAvg * j2, avg2026);
  let q1_2027 = roundToRealisticUnit(targetAvg * j3, avg2026);
  let q2_2027 = roundToRealisticUnit(targetAvg * j4, avg2026);

  // If quartersAvailable is specified (default is 2, representing data available up to TW IV 2026)
  const qAvail = config?.quartersAvailable ?? 2;
  if (qAvail < 4) q2_2027 = 0;
  if (qAvail < 3) q1_2027 = 0;
  if (qAvail < 2) q4_2026 = 0;

  // Occasional 0 price for missing respondent survey
  if (config?.allowZeroQuarters) {
    if (rng() < 0.02) q3_2026 = 0;
    else if (qAvail >= 2 && rng() < 0.02) q4_2026 = 0;
  }

  const validVals = [q3_2026, q4_2026, q1_2027, q2_2027].filter(v => v > 0);
  const avg2027 = validVals.length > 0 
    ? validVals.reduce((a, b) => a + b, 0) / validVals.length 
    : 0;

  let cv2027 = 0;
  if (validVals.length > 1 && avg2027 > 0) {
    const variance = validVals.reduce((acc, val) => acc + Math.pow(val - avg2027, 2), 0) / validVals.length;
    const stdDev = Math.sqrt(variance);
    cv2027 = (stdDev / avg2027) * 100;
  }

  return {
    q3_2026,
    q4_2026,
    q1_2027,
    q2_2027,
    avg2027: Math.round(avg2027 * 100) / 100,
    cv2027: Math.round(cv2027 * 100) / 100
  };
}
