/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  LogOut, 
  AlertTriangle, 
  CheckCircle2, 
  LogIn,
  KeyRound
} from 'lucide-react';
import { UserProfile, OWNER_EMAIL } from '../types/ikk';
import { loginWithGoogleEmail, logoutUser } from '../utils/auth';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
  reason?: 'upload' | 'catatan' | 'general';
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  reason = 'general'
}) => {
  if (!isOpen) return null;

  const [inputEmail, setInputEmail] = useState('');
  const [inputName, setInputName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginAsOwner = () => {
    const user = loginWithGoogleEmail(
      OWNER_EMAIL, 
      'Sifa Rofatunnisa (Pemilik)', 
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'
    );
    onUserChange(user);
    setErrorMsg('');
    onClose();
  };

  const handleLoginCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inputEmail.trim();
    if (!email || !email.includes('@')) {
      setErrorMsg('Masukkan alamat email Google yang valid (misal: nama@gmail.com)');
      return;
    }
    const user = loginWithGoogleEmail(email, inputName.trim() || undefined);
    onUserChange(user);
    setErrorMsg('');
    onClose();
  };

  const handleLogout = () => {
    logoutUser();
    onUserChange(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Google G Logo SVG */}
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-xs border border-slate-200">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Autentikasi Akun Google
              </h3>
              <p className="text-[11px] text-slate-500">
                Akses Peran &amp; Hak Penggunaan RekonIKK
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">

          {/* Context Reason Notice */}
          {reason === 'upload' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Akses Terbatas: Upload Dokumen</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Fitur Upload Dokumen (Tahun Lalu &amp; Tabel 7.1) hanya dapat diakses oleh <span className="font-bold underline">{OWNER_EMAIL}</span>. 
                  Jika Anda pengguna lain, Anda dapat masuk untuk memberikan catatan rekon.
                </p>
              </div>
            </div>
          )}

          {reason === 'catatan' && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg flex items-start gap-2.5 text-xs text-sky-900">
              <LogIn className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Masuk Akun Google untuk Catatan</p>
                <p className="text-[11px] text-sky-800 mt-0.5 leading-relaxed">
                  Masuk dengan akun Google Anda untuk dapat menambahkan, mengedit, dan menyimpan catatan rekon di setiap komoditas.
                </p>
              </div>
            </div>
          )}

          {/* Currently Logged In Card */}
          {currentUser ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Status Akun Aktif
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  currentUser.role === 'owner' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-sky-100 text-sky-800 border border-sky-300'
                }`}>
                  {currentUser.role === 'owner' ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pemilik Akun (Akses Penuh)</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                      <span>Kontributor Catatan</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-sm overflow-hidden shrink-0">
                  {currentUser.picture ? (
                    <img src={currentUser.picture} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              {/* Rights Description */}
              <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Akses Catatan Rekon: <strong>Diizinkan</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  {currentUser.role === 'owner' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Upload Dokumen &amp; Reset Data: <strong>Diizinkan</strong></span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Upload Dokumen: <strong>Terkunci (Hanya untuk Pemilik)</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* Logout button */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full mt-2 py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun Google (Kembali ke Tamu)</span>
              </button>
            </div>
          ) : (
            <>
              {/* Option 1: One-Click Login as Verified Owner */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Opsi 1: Masuk sebagai Pemilik Akun
                </div>
                <button
                  type="button"
                  onClick={handleLoginAsOwner}
                  className="w-full p-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl shadow-xs transition-all flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                      <KeyRound className="w-4 h-4 text-emerald-200" />
                    </div>
                    <div>
                      <p className="font-bold text-xs">
                        Masuk sebagai Pemilik Akun
                      </p>
                      <p className="text-[11px] text-emerald-100 font-mono">
                        {OWNER_EMAIL}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-1 bg-white/20 rounded-md text-white whitespace-nowrap">
                    Akses Penuh
                  </span>
                </button>
                <p className="text-[10px] text-slate-500 italic px-1">
                  * Akses penuh ke seluruh fitur termasuk Upload Dokumen Tahun Lalu &amp; Tabel 7.1.
                </p>
              </div>

              {/* Divider */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-400 font-medium">atau</span>
                </div>
              </div>

              {/* Option 2: Sign In with Another Google Account (Contributor) */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Opsi 2: Masuk dengan Akun Google Lain (Kontributor Catatan)
                </div>

                <form onSubmit={handleLoginCustom} className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Alamat Email Google
                    </label>
                    <input
                      type="email"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      placeholder="contoh: rekon.kalbar@gmail.com"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nama Lengkap (Opsional)
                    </label>
                    <input
                      type="text"
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      placeholder="contoh: Petugas Rekon Kalbar"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{errorMsg}</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Masuk sebagai Kontributor Catatan</span>
                  </button>
                </form>

                <p className="text-[10px] text-slate-500 italic px-1">
                  * Kontributor dapat menambahkan catatan rekon di setiap komoditas. Fitur upload berkas dibatasi untuk pemilik akun.
                </p>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
