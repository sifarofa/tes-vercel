/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Edit, 
  Trash2, 
  Plus, 
  Check, 
  Bookmark, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Save,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
  ShieldCheck,
  UserCheck,
  LogIn
} from 'lucide-react';
import { RespondentPriceItem, UserProfile } from '../types/ikk';
import { formatNumber } from '../utils/csvParser';

export interface RespondentQuarterRow {
  id: string;
  itemId: string;
  tahun: number; // 2026 or 2027
  triwulan: number; // 1, 2, 3, 4
  namaResp: string;
  namaMerek: string;
  harga: number;
}

interface DetailRekondaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onRequestLogin?: (reason?: 'upload' | 'catatan' | 'general') => void;
  kodeKab: string;
  namaKab: string;
  kualitasRekon: string;
  kodeKualitasRekon: string;
  isMarked: boolean;
  onToggleMark: () => void;
  catatan: string;
  onSaveCatatan: (note: string) => void;
  respondents: RespondentPriceItem[];
  onUpdatePriceEntry: (itemId: string, field: 'q3_2026' | 'q4_2026' | 'q1_2027' | 'q2_2027' | 'q3_2025' | 'q4_2025' | 'q1_2026' | 'q2_2026', newPrice: number) => void;
  onAddQuarterEntry: (tahun: number, triwulan: number, namaResp: string, merek: string, harga: number) => void;
  onDeleteQuarterEntry?: (id: string) => void;
}

export const DetailRekondaModal: React.FC<DetailRekondaModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRequestLogin,
  kodeKab,
  namaKab,
  kualitasRekon,
  kodeKualitasRekon,
  isMarked,
  onToggleMark,
  catatan,
  onSaveCatatan,
  respondents,
  onUpdatePriceEntry,
  onAddQuarterEntry
}) => {
  if (!isOpen) return null;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [catatanText, setCatatanText] = useState(catatan || '');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [savedNoteMsg, setSavedNoteMsg] = useState(false);

  // Form for adding a new entry
  const [addFormOpen, setAddFormOpen] = useState<{ open: boolean; tahun: number; triwulan: number }>({
    open: false,
    tahun: 2027,
    triwulan: 1
  });
  const [newRespName, setNewRespName] = useState('');
  const [newMerek, setNewMerek] = useState('');
  const [newHarga, setNewHarga] = useState<number>(0);

  // Form for editing an existing row
  const [editingRow, setEditingRow] = useState<{ id: string; itemId: string; field: any; harga: number } | null>(null);

  // Build the list of quarter entries from respondents
  // 2026 quarters: III-2025 (Tahun 2026 TW 3), IV-2025 (Tahun 2026 TW 4), I-2026 (Tahun 2026 TW 1), II-2026 (Tahun 2026 TW 2)
  // 2027 quarters: III-2026 (Tahun 2027 TW 3), IV-2026 (Tahun 2027 TW 4), I-2027 (Tahun 2027 TW 1), II-2027 (Tahun 2027 TW 2)
  const quarterRows: RespondentQuarterRow[] = useMemo(() => {
    const list: RespondentQuarterRow[] = [];

    respondents.forEach(resp => {
      // 2026 quarters
      if (resp.q3_2025 > 0) {
        list.push({
          id: `${resp.id}_2026_3`,
          itemId: resp.id,
          tahun: 2026,
          triwulan: 3,
          namaResp: resp.namaResp,
          namaMerek: resp.namaMerek || '-',
          harga: resp.q3_2025
        });
      }
      if (resp.q4_2025 > 0) {
        list.push({
          id: `${resp.id}_2026_4`,
          itemId: resp.id,
          tahun: 2026,
          triwulan: 4,
          namaResp: resp.namaResp,
          namaMerek: resp.namaMerek || '-',
          harga: resp.q4_2025
        });
      }
      if (resp.q1_2026 > 0) {
        list.push({
          id: `${resp.id}_2026_1`,
          itemId: resp.id,
          tahun: 2026,
          triwulan: 1,
          namaResp: resp.namaResp,
          namaMerek: resp.namaMerek || '-',
          harga: resp.q1_2026
        });
      }
      if (resp.q2_2026 > 0) {
        list.push({
          id: `${resp.id}_2026_2`,
          itemId: resp.id,
          tahun: 2026,
          triwulan: 2,
          namaResp: resp.namaResp,
          namaMerek: resp.namaMerek || '-',
          harga: resp.q2_2026
        });
      }

      // 2027 quarters
      if (resp.q3_2026 > 0) {
        list.push({
          id: `${resp.id}_2027_3`,
          itemId: resp.id,
          tahun: 2027,
          triwulan: 3,
          namaResp: resp.namaResp,
          namaMerek: resp.namaMerek || '-',
          harga: resp.q3_2026
        });
      }
      if (resp.q4_2026 > 0) {
        list.push({
          id: `${resp.id}_2027_4`,
          itemId: resp.id,
          tahun: 2027,
          triwulan: 4,
          namaResp: resp.namaResp,
          namaMerek: resp.namaMerek || '-',
          harga: resp.q4_2026
        });
      }
      if (resp.q1_2027 > 0) {
        list.push({
          id: `${resp.id}_2027_1`,
          itemId: resp.id,
          tahun: 2027,
          triwulan: 1,
          namaResp: resp.namaResp,
          namaMerek: resp.namaMerek || '-',
          harga: resp.q1_2027
        });
      }
      if (resp.q2_2027 > 0) {
        list.push({
          id: `${resp.id}_2027_2`,
          itemId: resp.id,
          tahun: 2027,
          triwulan: 2,
          namaResp: resp.namaResp,
          namaMerek: resp.namaMerek || '-',
          harga: resp.q2_2027
        });
      }
    });

    // Sort by tahun desc, triwulan desc, namaResp
    return list.sort((a, b) => {
      if (b.tahun !== a.tahun) return b.tahun - a.tahun;
      if (b.triwulan !== a.triwulan) return b.triwulan - a.triwulan;
      return a.namaResp.localeCompare(b.namaResp);
    });
  }, [respondents]);

  type ModalSortField = 'tahun' | 'triwulan' | 'namaResp' | 'namaMerek' | 'harga';
  const [sortField, setSortField] = useState<ModalSortField>('tahun');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: ModalSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered and Sorted
  const filteredRows = useMemo(() => {
    let list = quarterRows;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => 
        r.namaResp.toLowerCase().includes(q) ||
        r.namaMerek.toLowerCase().includes(q) ||
        String(r.harga).includes(q) ||
        String(r.tahun).includes(q) ||
        String(r.triwulan).includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return sortDirection === 'asc' ? (valA - valB) : (valB - valA);
    });
  }, [quarterRows, search, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const handleSaveCatatan = () => {
    if (!currentUser) {
      onRequestLogin?.('catatan');
      return;
    }
    onSaveCatatan(catatanText);
    setIsEditingNote(false);
    setSavedNoteMsg(true);
    setTimeout(() => setSavedNoteMsg(false), 2000);
  };

  const handleOpenAdd = (tahun: number, triwulan: number) => {
    if (currentUser?.role !== 'owner') {
      alert('Penambahan entri harga responden khusus untuk Pemilik Akun (sifarofatunnisa24@gmail.com). Kontributor dapat memberikan masukan melalui kolom Catatan.');
      onRequestLogin?.('general');
      return;
    }
    const defaultResp = respondents[0]?.namaResp || '';
    const defaultMerek = respondents[0]?.namaMerek || '';
    const defaultHarga = respondents[0]?.avg2027 || respondents[0]?.avg2026 || 0;
    setNewRespName(defaultResp);
    setNewMerek(defaultMerek);
    setNewHarga(Math.round(defaultHarga));
    setAddFormOpen({ open: true, tahun, triwulan });
  };

  const handleSaveNewEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'owner') return;
    if (!newRespName || newHarga <= 0) return;
    onAddQuarterEntry(addFormOpen.tahun, addFormOpen.triwulan, newRespName, newMerek, newHarga);
    setAddFormOpen({ open: false, tahun: 2027, triwulan: 1 });
  };

  const handleStartEdit = (row: RespondentQuarterRow) => {
    if (currentUser?.role !== 'owner') {
      alert('Pengeditan harga responden khusus untuk Pemilik Akun (sifarofatunnisa24@gmail.com). Anda dapat memberikan masukan pada kolom Catatan Rekon.');
      onRequestLogin?.('general');
      return;
    }
    let field: any = 'q1_2027';
    if (row.tahun === 2026) {
      if (row.triwulan === 3) field = 'q3_2025';
      else if (row.triwulan === 4) field = 'q4_2025';
      else if (row.triwulan === 1) field = 'q1_2026';
      else if (row.triwulan === 2) field = 'q2_2026';
    } else {
      if (row.triwulan === 3) field = 'q3_2026';
      else if (row.triwulan === 4) field = 'q4_2026';
      else if (row.triwulan === 1) field = 'q1_2027';
      else if (row.triwulan === 2) field = 'q2_2027';
    }
    setEditingRow({
      id: row.id,
      itemId: row.itemId,
      field,
      harga: row.harga
    });
  };

  const handleSaveEditingRow = () => {
    if (!editingRow) return;
    if (currentUser?.role !== 'owner') return;
    onUpdatePriceEntry(editingRow.itemId, editingRow.field, editingRow.harga);
    setEditingRow(null);
  };

  const handleDeleteRow = (row: RespondentQuarterRow) => {
    if (currentUser?.role !== 'owner') {
      alert('Penghapusan data harga responden khusus untuk Pemilik Akun (sifarofatunnisa24@gmail.com).');
      return;
    }
    if (window.confirm(`Hapus entri harga ${row.namaResp} (Tahun ${row.tahun} TW ${row.triwulan})?`)) {
      let field: any = 'q1_2027';
      if (row.tahun === 2026) {
        if (row.triwulan === 3) field = 'q3_2025';
        else if (row.triwulan === 4) field = 'q4_2025';
        else if (row.triwulan === 1) field = 'q1_2026';
        else if (row.triwulan === 2) field = 'q2_2026';
      } else {
        if (row.triwulan === 3) field = 'q3_2026';
        else if (row.triwulan === 4) field = 'q4_2026';
        else if (row.triwulan === 1) field = 'q1_2027';
        else if (row.triwulan === 2) field = 'q2_2027';
      }
      onUpdatePriceEntry(row.itemId, field, 0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - exactly matching screenshot */}
        <div className="flex items-start justify-between p-4 border-b border-slate-200 bg-white">
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Detail Rekonda
            </h3>
            <div className="text-xs text-slate-800 font-semibold mt-1">
              Kab/Kota : [{kodeKab}] {namaKab}
            </div>
            <div className="text-xs text-slate-700 font-medium">
              Kualitas Rekon : {kualitasRekon}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3.5">
          
          {/* Controls: Tampilkan entri & Cari */}
          <div className="flex items-center justify-between text-xs text-slate-700">
            <div className="flex items-center gap-1.5">
              <span>tampilkan</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 border border-slate-300 rounded-sm bg-white text-xs font-mono"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entri</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>Cari:</span>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="px-2.5 py-1 border border-slate-300 rounded-sm text-xs bg-white w-40 sm:w-48"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[11px] select-none">
                  <th 
                    onClick={() => handleSort('tahun')}
                    className="py-2.5 px-3 border-r border-slate-200 text-center w-20 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="inline-flex items-center gap-1 justify-center">
                      <span>Tahun</span>
                      {sortField === 'tahun' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-sky-600" /> : <ArrowDown className="w-3 h-3 text-sky-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('triwulan')}
                    className="py-2.5 px-3 border-r border-slate-200 text-center w-20 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="inline-flex items-center gap-1 justify-center">
                      <span>Triwulan</span>
                      {sortField === 'triwulan' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-sky-600" /> : <ArrowDown className="w-3 h-3 text-sky-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('namaResp')}
                    className="py-2.5 px-3 border-r border-slate-200 min-w-[200px] cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>Responden</span>
                      {sortField === 'namaResp' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-sky-600" /> : <ArrowDown className="w-3 h-3 text-sky-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('namaMerek')}
                    className="py-2.5 px-3 border-r border-slate-200 min-w-[120px] cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>Merk</span>
                      {sortField === 'namaMerek' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-sky-600" /> : <ArrowDown className="w-3 h-3 text-sky-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('harga')}
                    className="py-2.5 px-3 border-r border-slate-200 text-right min-w-[120px] cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="inline-flex items-center gap-1 justify-end w-full">
                      <span>Harga</span>
                      {sortField === 'harga' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-sky-600" /> : <ArrowDown className="w-3 h-3 text-sky-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th className="py-2.5 px-3 text-center w-24">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Tidak ada entri harga yang ditemukan
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => {
                    const isEditingThis = editingRow?.id === row.id;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        {/* Tahun */}
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">
                          {row.tahun}
                        </td>

                        {/* Triwulan */}
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-mono font-semibold">
                          {row.triwulan}
                        </td>

                        {/* Responden */}
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-medium">
                          {row.namaResp}
                        </td>

                        {/* Merk */}
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                          {row.namaMerek}
                        </td>

                        {/* Harga */}
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                          {isEditingThis ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={editingRow.harga}
                                onChange={(e) => setEditingRow({ ...editingRow, harga: Number(e.target.value) || 0 })}
                                className="w-24 px-1.5 py-0.5 border border-amber-400 text-right font-mono text-xs rounded-xs"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveEditingRow}
                                className="p-1 bg-emerald-600 text-white rounded-xs hover:bg-emerald-700"
                                title="Simpan"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            formatNumber(row.harga, 0)
                          )}
                        </td>

                        {/* Aksi (Yellow Edit ✏️, Red Delete 🗑️) exactly matching screenshot */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(row)}
                              title="Edit Harga"
                              className="w-7 h-7 bg-[#ffc107] hover:bg-[#e0a800] text-slate-900 rounded-sm flex items-center justify-center shadow-2xs transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-900" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(row)}
                              title="Hapus Entri"
                              className="w-7 h-7 bg-[#dc3545] hover:bg-[#c82333] text-white rounded-sm flex items-center justify-center shadow-2xs transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 pt-1">
            <div>
              Menampilkan {filteredRows.length > 0 ? (page - 1) * pageSize + 1 : 0} sampai {Math.min(page * pageSize, filteredRows.length)} dari {filteredRows.length} entri
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-sm bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="px-2.5 py-1 text-xs bg-sky-600 text-white font-bold rounded-sm">
                {page}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-sm bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>

          {/* Section: Catatan with Yellow Edit button (exactly matching screenshot) */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Catatan</span>
                <button
                  onClick={() => {
                    if (!currentUser) {
                      onRequestLogin?.('catatan');
                    } else {
                      setIsEditingNote(!isEditingNote);
                    }
                  }}
                  className="w-6 h-6 bg-[#ffc107] hover:bg-[#e0a800] text-slate-900 rounded-sm flex items-center justify-center shadow-2xs"
                  title="Edit Catatan"
                >
                  <Edit className="w-3 h-3 text-slate-900" />
                </button>
                {savedNoteMsg && (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Tersimpan
                  </span>
                )}
              </div>

              {/* Contributor / Owner info badge */}
              {currentUser ? (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <span>Dicatat oleh: <strong>{currentUser.name}</strong></span>
                  <span className={`px-1.5 py-0.2 rounded-xs text-[10px] font-bold ${
                    currentUser.role === 'owner' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                  }`}>
                    {currentUser.role === 'owner' ? 'Pemilik' : 'Kontributor'}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onRequestLogin?.('catatan')}
                  className="inline-flex items-center gap-1 text-[11px] text-sky-700 hover:text-sky-900 hover:underline font-semibold"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Masuk Akun Google untuk mencatat</span>
                </button>
              )}
            </div>

            <textarea
              rows={3}
              value={catatanText}
              onChange={(e) => {
                if (!currentUser) {
                  onRequestLogin?.('catatan');
                  return;
                }
                setCatatanText(e.target.value);
                setIsEditingNote(true);
              }}
              onFocus={() => {
                if (!currentUser) {
                  onRequestLogin?.('catatan');
                }
              }}
              placeholder={currentUser ? "Tuliskan catatan rekonsiliasi atau verifikasi lapangan untuk kabupaten/kota ini..." : "Masuk dengan Akun Google untuk menulis catatan..."}
              className="w-full p-2.5 border border-slate-300 rounded-sm text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-sans"
            />
            {isEditingNote && (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="px-3 py-1 border border-slate-300 text-slate-700 rounded-sm text-xs hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCatatan}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-white rounded-sm text-xs font-semibold hover:bg-slate-900"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Catatan</span>
                </button>
              </div>
            )}
          </div>

          {/* Add Entry Sub-Form */}
          {addFormOpen.open && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                <span>Tambah Data Harga Triwulan {addFormOpen.tahun}/{addFormOpen.triwulan}</span>
                <button onClick={() => setAddFormOpen({ open: false, tahun: 2027, triwulan: 1 })} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveNewEntry} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-600 mb-0.5">Nama Responden / Toko:</label>
                  <input
                    type="text"
                    value={newRespName}
                    onChange={(e) => setNewRespName(e.target.value)}
                    required
                    className="w-full px-2 py-1 border border-slate-300 rounded-xs bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Merk:</label>
                  <input
                    type="text"
                    value={newMerek}
                    onChange={(e) => setNewMerek(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded-xs bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Harga (Rp):</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="1"
                      value={newHarga}
                      onChange={(e) => setNewHarga(Number(e.target.value))}
                      required
                      className="w-full px-2 py-1 border border-slate-300 rounded-xs bg-white text-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-xs text-xs font-bold hover:bg-emerald-700"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Bottom Actions Bar - EXACTLY MATCHING SCREENSHOT */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          
          {/* Left: Yellow 'tandai' button */}
          <button
            type="button"
            onClick={onToggleMark}
            className={`px-4 py-1.5 text-xs font-bold rounded-sm shadow-xs transition-colors flex items-center gap-1.5 ${
              isMarked 
                ? 'bg-amber-500 text-slate-900 border border-amber-600' 
                : 'bg-[#ffc107] text-slate-900 hover:bg-[#e0a800]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 fill-current" />
            <span>{isMarked ? 'hilangkan tanda' : 'tandai'}</span>
          </button>

          {/* Right: tambah triwulan buttons and tutup */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenAdd(2026, 3)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#007bff] hover:bg-[#0069d9] rounded-sm transition-colors shadow-2xs"
            >
              tambah 2026/3
            </button>
            <button
              type="button"
              onClick={() => handleOpenAdd(2026, 4)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#007bff] hover:bg-[#0069d9] rounded-sm transition-colors shadow-2xs"
            >
              tambah 2026/4
            </button>
            <button
              type="button"
              onClick={() => handleOpenAdd(2027, 1)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#007bff] hover:bg-[#0069d9] rounded-sm transition-colors shadow-2xs"
            >
              tambah 2027/1
            </button>
            <button
              type="button"
              onClick={() => handleOpenAdd(2027, 2)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#007bff] hover:bg-[#0069d9] rounded-sm transition-colors shadow-2xs"
            >
              tambah 2027/2
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#6c757d] hover:bg-[#5a6268] rounded-sm transition-colors"
            >
              tutup
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
