/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Table2, 
  Building2, 
  Sliders, 
  Download, 
  RotateCcw,
  Upload,
  Lock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { SummaryStats, UserProfile } from '../types/ikk';

interface HeaderProps {
  activeTab: 'rekonda' | 'rekon' | 'respondent';
  setActiveTab: (tab: 'rekonda' | 'rekon' | 'respondent') => void;
  summary: SummaryStats | null;
  currentUser: UserProfile | null;
  onOpenAuthModal: (reason?: 'upload' | 'catatan' | 'general') => void;
  onOpenUploadModal: () => void;
  onOpenSimulator: () => void;
  onResetEdits: () => void;
  onExportCsv: () => void;
  hasEdits: boolean;
  hasCustomUploads?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  summary,
  currentUser,
  onOpenAuthModal,
  onOpenUploadModal,
  onOpenSimulator,
  onResetEdits,
  onExportCsv,
  hasEdits
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Brand title wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-[#d82b54] flex items-center justify-center text-white font-bold text-base shadow-xs">
              IKK
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900 whitespace-nowrap">
                  RekonIKK
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                  Kalbar 2026/2027
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Clean & without pill badges) */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {/* Tab 1: Rekon Daerah */}
            <button
              onClick={() => setActiveTab('rekonda')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'rekonda'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#d82b54]" />
              <span>Rekon Daerah</span>
            </button>

            {/* Tab 2: Rekap Anomali Rasio */}
            <button
              onClick={() => setActiveTab('rekon')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'rekon'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Tabel Anomali &amp; Rekon</span>
              {summary && (
                <span className="text-[11px] font-mono font-bold text-amber-700 ml-0.5">
                  ({summary.countRasioHigh + summary.countRasioLow})
                </span>
              )}
            </button>

            {/* Tab 3: Penelusuran Responden */}
            <button
              onClick={() => setActiveTab('respondent')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'respondent'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Penelusuran Responden</span>
            </button>
          </nav>

          {/* Zone 3: Primary Actions & User Auth */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Primary Action Button: Upload Dokumen (Strictly Restricted to Account Owner) */}
            {currentUser?.role === 'owner' ? (
              <button
                type="button"
                onClick={onOpenUploadModal}
                title="Upload dokumen data harga IKK (Akses Pemilik Akun)"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Dokumen</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuthModal('upload')}
                title="Akses Upload Dokumen khusus untuk Pemilik Akun (sifarofatunnisa24@gmail.com)"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Upload Dokumen</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-xs border border-amber-200">
                  Khusus Pemilik
                </span>
              </button>
            )}

            {/* Secondary Action: Pengaturan Simulator / Dummy (Khusus Pemilik) */}
            {currentUser?.role === 'owner' && (
              <button
                type="button"
                onClick={onOpenSimulator}
                title="Pengaturan kalibrasi data"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 shadow-2xs"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Pengaturan</span>
              </button>
            )}

            {hasEdits && currentUser?.role === 'owner' && (
              <button
                type="button"
                onClick={onResetEdits}
                title="Reset seluruh editan harga manual"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Reset Edit</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ekspor Rekon</span>
            </button>

            {/* Google Authentication Status / Sign In Button */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => onOpenAuthModal('general')}
                className={`flex items-center gap-2 px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  currentUser.role === 'owner'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                    : 'bg-sky-50 border-sky-300 text-sky-900 hover:bg-sky-100'
                }`}
                title={`Masuk sebagai ${currentUser.email} (${currentUser.role === 'owner' ? 'Pemilik Akun' : 'Kontributor Catatan'})`}
              >
                <div className="w-5 h-5 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-[10px] text-slate-700 overflow-hidden shrink-0">
                  {currentUser.picture ? (
                    <img src={currentUser.picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="text-left hidden lg:block">
                  <span className="font-semibold block text-[11px] leading-tight truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block leading-tight">
                    {currentUser.role === 'owner' ? 'Pemilik Akun' : 'Kontributor'}
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuthModal('general')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md shadow-2xs transition-colors whitespace-nowrap shrink-0"
                title="Masuk dengan Akun Google"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Masuk Google</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile Tab bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100 no-scrollbar">
          <button
            onClick={() => setActiveTab('rekonda')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'rekonda' ? 'bg-[#d82b54] text-white font-semibold' : 'text-slate-600'
            }`}
          >
            Rekon Daerah
          </button>
          <button
            onClick={() => setActiveTab('rekon')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'rekon' ? 'bg-amber-100 text-amber-900 font-semibold' : 'text-slate-600'
            }`}
          >
            Tabel Anomali
          </button>
          <button
            onClick={() => setActiveTab('respondent')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'respondent' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600'
            }`}
          >
            Penelusuran Responden
          </button>
        </div>

      </div>
    </header>
  );
};
