/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RekonDaerahRow } from '../types/ikk';
import { formatNumber, formatRupiah } from '../utils/csvParser';

interface GrafikRekondaProps {
  rows: RekonDaerahRow[];
  kualitasRekonTitle: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSelectKab?: (kodeKab: string) => void;
}

export const GrafikRekonda: React.FC<GrafikRekondaProps> = ({
  rows,
  kualitasRekonTitle,
  sortField,
  sortDirection,
  onSelectKab
}) => {
  const [hoveredKab, setHoveredKab] = useState<RekonDaerahRow | null>(null);

  // Friendly sort field name mapping
  const getSortLabel = (field?: string) => {
    switch (field) {
      case 'avg2027': return 'Harga 2027';
      case 'avg2026': return 'Harga 2026';
      case 'rasio': return 'Rasio';
      case 'cv2027': return 'Koefisien Variasi';
      case 'kodeKab': return 'Kabupaten/Kota';
      case 'q3_2026': return 'TW III 2026';
      case 'q4_2026': return 'TW IV 2026';
      case 'q1_2027': return 'TW I 2027';
      case 'q2_2027': return 'TW II 2027';
      case 'namaMerekUtama': return 'Merek';
      default: return field || 'Tabel';
    }
  };

  // Calculate maximum price across rows for Y-axis scale
  const maxPrice = Math.max(
    ...rows.map(r => r.avg2027 || 0),
    100
  );
  
  // Nice round step for Y axis (10k, 20k, 50k, 100k, etc.)
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxPrice)));
  const normalized = maxPrice / magnitude;
  let niceMultiplier = 1;
  if (normalized <= 1.2) niceMultiplier = 1.4;
  else if (normalized <= 2) niceMultiplier = 2.4;
  else if (normalized <= 5) niceMultiplier = 6;
  else niceMultiplier = 10;
  
  const yAxisMax = Math.ceil(niceMultiplier * magnitude);
  const yTicks = [0, yAxisMax * 0.25, yAxisMax * 0.5, yAxisMax * 0.75, yAxisMax];

  // Proportions matching the table width seamlessly
  const chartHeight = 290;
  const chartWidth = 1000;
  const paddingLeft = 65;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 42;

  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const barCount = rows.length || 14;
  const barSlotWidth = plotWidth / barCount;
  // Wide solid bars matching image_8c885a61.png
  const barWidth = Math.min(barSlotWidth * 0.76, 52);

  return (
    <div className="border border-slate-300 rounded-xs bg-white overflow-hidden w-full">
      
      {/* Centered Title exactly matching reference screenshots & indicating dynamic sorting */}
      <div className="pt-3 pb-1 text-center">
        <h3 className="font-bold text-slate-800 text-sm tracking-wide">
          Grafik Rekonda
        </h3>
        {sortField && (
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Dinamis mengikuti tabel: {getSortLabel(sortField)} ({sortDirection === 'desc' ? 'Tertinggi ke Terendah' : 'Terendah ke Tertinggi'})
          </p>
        )}
      </div>

      {/* Responsive SVG Chart spanning exactly 100% of container */}
      <div className="relative w-full px-2 sm:px-3 pb-3">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          preserveAspectRatio="none"
          className="w-full h-64 sm:h-72 select-none block"
        >
          {/* Background Gridlines and Y Labels */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + plotHeight - (tick / yAxisMax) * plotHeight;
            return (
              <g key={i}>
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={chartWidth - paddingRight} 
                  y2={y} 
                  stroke="#e5e7eb" 
                  strokeWidth="1"
                />
                <text 
                  x={paddingLeft - 8} 
                  y={y + 3.5} 
                  fill="#94a3b8" 
                  fontSize="9.5" 
                  fontFamily="monospace"
                  textAnchor="end"
                  className="tabular-nums"
                >
                  {tick === 0 ? '0' : formatNumber(tick, 0)}
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line 
            x1={paddingLeft} 
            y1={paddingTop + plotHeight} 
            x2={chartWidth - paddingRight} 
            y2={paddingTop + plotHeight} 
            stroke="#cbd5e1" 
            strokeWidth="1.2"
          />

          {/* 14 Kabupaten Bars */}
          {rows.map((row, idx) => {
            const xSlotCenter = paddingLeft + (idx + 0.5) * barSlotWidth;
            const x = xSlotCenter - barWidth / 2;
            const barH = row.avg2027 > 0 ? (row.avg2027 / yAxisMax) * plotHeight : 0;
            const y = paddingTop + plotHeight - barH;
            const isHovered = hoveredKab?.kodeKab === row.kodeKab;
            const isAnomali = row.isHighlighted || row.rasio > 100 || row.rasio < 80;

            // Soft blue matching user screenshot (#5dade2 / #5499c7), amber if highlighted/anomali
            const barColor = isHovered 
              ? '#2563eb' 
              : isAnomali 
                ? '#f59e0b' 
                : '#6baed6';

            return (
              <g 
                key={row.kodeKab}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredKab(row)}
                onMouseLeave={() => setHoveredKab(null)}
                onClick={() => onSelectKab && onSelectKab(row.kodeKab)}
              >
                {/* Full slot hover target */}
                <rect 
                  x={xSlotCenter - barSlotWidth / 2} 
                  y={paddingTop} 
                  width={barSlotWidth} 
                  height={plotHeight + 35} 
                  fill="transparent" 
                />

                {/* Solid Bar */}
                <rect 
                  x={x} 
                  y={y} 
                  width={barWidth} 
                  height={Math.max(barH, 1)} 
                  fill={barColor}
                  className="transition-colors duration-150"
                />

                {/* Value on hover */}
                {isHovered && row.avg2027 > 0 && (
                  <text 
                    x={xSlotCenter} 
                    y={Math.max(y - 5, paddingTop + 2)} 
                    fill="#0f172a" 
                    fontSize="9.5" 
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="tabular-nums"
                  >
                    {formatNumber(row.avg2027, 0)}
                  </text>
                )}

                {/* X Axis Label: 6101, 6102, ... */}
                <text 
                  x={xSlotCenter} 
                  y={paddingTop + plotHeight + 17} 
                  fill={isHovered ? '#0f172a' : '#64748b'} 
                  fontSize="10" 
                  fontFamily="monospace"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {row.kodeKab}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredKab && (
          <div 
            className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900/95 text-white text-xs px-3.5 py-2 rounded-lg shadow-xl font-mono border border-slate-700 z-30"
          >
            <div className="font-bold font-sans text-amber-300 text-xs">
              [{hoveredKab.kodeKab}] {hoveredKab.namaKab}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-300 mt-0.5">
              <span>Harga 2027: <strong className="text-white">{formatRupiah(hoveredKab.avg2027)}</strong></span>
              <span>Harga 2026: <span className="text-slate-200">{formatRupiah(hoveredKab.avg2026)}</span></span>
              <span>Rasio: <strong className={hoveredKab.rasio > 100 ? 'text-amber-300' : hoveredKab.rasio < 80 ? 'text-rose-300' : 'text-emerald-300'}>
                {formatNumber(hoveredKab.rasio, 2)}%
              </strong></span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
