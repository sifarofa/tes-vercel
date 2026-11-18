/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RespondentPriceItem } from '../types/ikk';
import { DummyGeneratorConfig } from './dummyGenerator';

const STORAGE_KEYS = {
  REKON_NOTES: 'rekon_ikk_notes_v1',
  REKON_STATUS: 'rekon_ikk_status_v1',
  MANUAL_EDITS: 'rekon_ikk_manual_edits_v1',
  DUMMY_CONFIG: 'rekon_ikk_dummy_config_v1',
  KAB_FLAGS: 'rekon_ikk_kab_flags_v1',
  KAB_NOTES: 'rekon_ikk_kab_notes_v1',
  QUARTER_ENTRIES: 'rekon_ikk_quarter_entries_v1',
  CUSTOM_BERJALAN: 'rekon_ikk_custom_berjalan_v1',
  CUSTOM_LALU: 'rekon_ikk_custom_lalu_v1',
  UPLOAD_META: 'rekon_ikk_upload_meta_v1'
};

export interface UploadMetadata {
  hasCustomBerjalan: boolean;
  hasCustomLalu: boolean;
  berjalanFileName?: string;
  laluFileName?: string;
  berjalanRecordCount?: number;
  laluRecordCount?: number;
  quartersDetected?: string[];
  updatedAt?: string;
}

export interface ServerSyncResult {
  connected: boolean;
  statusesCount: number;
  notesCount: number;
  editsCount: number;
  lastUpdated?: string;
}

/**
 * Asynchronously posts data to the Express backend to ensure server persistence
 */
async function postToServer(endpoint: string, body: any): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res.ok;
  } catch (err) {
    console.warn(`[RekonIKK Server Sync] Could not post to ${endpoint}:`, err);
    return false;
  }
}

/**
 * Synchronizes client state with the server on startup or manual refresh
 */
export async function syncWithServer(): Promise<ServerSyncResult> {
  try {
    const res = await fetch('/api/rekon/state');
    if (!res.ok) {
      return { connected: false, statusesCount: 0, notesCount: 0, editsCount: 0 };
    }
    const json = await res.json();
    if (json.success && json.data) {
      const serverState = json.data;

      // Current local states
      const localStatuses = getStoredStatus();
      const localNotes = getStoredNotes();
      const localKabFlags = getStoredKabFlags();
      const localKabNotes = getStoredKabNotes();
      const localEdits = getStoredManualEdits();

      // Merge server state with local state (server state takes precedence if set)
      const mergedStatuses = { ...localStatuses, ...(serverState.statuses || {}) };
      const mergedNotes = { ...localNotes, ...(serverState.notes || {}) };
      const mergedKabFlags = { ...localKabFlags, ...(serverState.kabFlags || {}) };
      const mergedKabNotes = { ...localKabNotes, ...(serverState.kabNotes || {}) };
      const mergedEdits = { ...localEdits, ...(serverState.manualEdits || {}) };

      localStorage.setItem(STORAGE_KEYS.REKON_STATUS, JSON.stringify(mergedStatuses));
      localStorage.setItem(STORAGE_KEYS.REKON_NOTES, JSON.stringify(mergedNotes));
      localStorage.setItem(STORAGE_KEYS.KAB_FLAGS, JSON.stringify(mergedKabFlags));
      localStorage.setItem(STORAGE_KEYS.KAB_NOTES, JSON.stringify(mergedKabNotes));
      localStorage.setItem(STORAGE_KEYS.MANUAL_EDITS, JSON.stringify(mergedEdits));

      // Re-sync merged state to server so server has any local additions
      postToServer('/api/rekon/batch-sync', {
        statuses: mergedStatuses,
        notes: mergedNotes,
        kabFlags: mergedKabFlags,
        kabNotes: mergedKabNotes,
        manualEdits: mergedEdits
      });

      return {
        connected: true,
        statusesCount: Object.keys(mergedStatuses).length,
        notesCount: Object.keys(mergedNotes).length,
        editsCount: Object.keys(mergedEdits).length,
        lastUpdated: serverState.lastUpdated
      };
    }
  } catch (err) {
    console.warn('[RekonIKK Server Sync] Server unreachable, running in local fallback mode:', err);
  }
  return { connected: false, statusesCount: 0, notesCount: 0, editsCount: 0 };
}

export function getStoredUploadMeta(): UploadMetadata {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.UPLOAD_META);
    return raw ? JSON.parse(raw) : { hasCustomBerjalan: false, hasCustomLalu: false };
  } catch {
    return { hasCustomBerjalan: false, hasCustomLalu: false };
  }
}

export function saveUploadMeta(meta: UploadMetadata): void {
  try {
    localStorage.setItem(STORAGE_KEYS.UPLOAD_META, JSON.stringify(meta));
  } catch (e) {
    console.error('Failed to save upload metadata', e);
  }
}

export function getStoredCustomBerjalan(): any[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_BERJALAN);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCustomBerjalan(rows: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_BERJALAN, JSON.stringify(rows));
  } catch (e) {
    console.error('Failed to save custom berjalan', e);
  }
}

export function getStoredCustomLalu(): any[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_LALU);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCustomLalu(rows: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_LALU, JSON.stringify(rows));
  } catch (e) {
    console.error('Failed to save custom lalu', e);
  }
}

export function getStoredKabFlags(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KAB_FLAGS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function toggleKabFlag(kualitasKey: string, kodeKab: string): boolean {
  try {
    const flags = getStoredKabFlags();
    const key = `${kualitasKey}_${kodeKab}`;
    const newState = !flags[key];
    flags[key] = newState;
    localStorage.setItem(STORAGE_KEYS.KAB_FLAGS, JSON.stringify(flags));
    // Asynchronously persist to server
    postToServer('/api/rekon/kab-flag', { kualitasKey, kodeKab, isFlagged: newState });
    return newState;
  } catch {
    return false;
  }
}

export function getStoredKabNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KAB_NOTES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveKabNote(kualitasKey: string, kodeKab: string, note: string): void {
  try {
    const notes = getStoredKabNotes();
    const key = `${kualitasKey}_${kodeKab}`;
    if (note.trim()) {
      notes[key] = note.trim();
    } else {
      delete notes[key];
    }
    localStorage.setItem(STORAGE_KEYS.KAB_NOTES, JSON.stringify(notes));
    // Asynchronously persist to server
    postToServer('/api/rekon/kab-note', { kualitasKey, kodeKab, note });
  } catch (e) {
    console.error('Failed to save kab note', e);
  }
}

export function getStoredNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REKON_NOTES);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load stored notes', e);
    return {};
  }
}

export function saveNote(id: string, note: string): void {
  try {
    const notes = getStoredNotes();
    if (note.trim()) {
      notes[id] = note.trim();
    } else {
      delete notes[id];
    }
    localStorage.setItem(STORAGE_KEYS.REKON_NOTES, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save note locally', e);
  }
  // Asynchronously persist to server
  postToServer('/api/rekon/note', { id, note });
}

export function getStoredStatus(): Record<string, RespondentPriceItem['rekonStatus']> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REKON_STATUS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load stored status', e);
    return {};
  }
}

export function saveStatus(id: string, status: RespondentPriceItem['rekonStatus']): void {
  try {
    const all = getStoredStatus();
    all[id] = status;
    localStorage.setItem(STORAGE_KEYS.REKON_STATUS, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save status locally', e);
  }
  // Asynchronously persist to server
  postToServer('/api/rekon/status', { id, status });
}

export interface ManualPriceEdit {
  q3_2026?: number;
  q4_2026?: number;
  q1_2027?: number;
  q2_2027?: number;
  catatan?: string;
  updatedAt: string;
}

export function getStoredManualEdits(): Record<string, ManualPriceEdit> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MANUAL_EDITS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load stored edits', e);
    return {};
  }
}

export function saveManualEdit(id: string, edit: ManualPriceEdit): void {
  try {
    const all = getStoredManualEdits();
    all[id] = edit;
    localStorage.setItem(STORAGE_KEYS.MANUAL_EDITS, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save edit locally', e);
  }
  // Asynchronously persist to server
  postToServer('/api/rekon/manual-edit', { id, edit });
}

export function clearManualEdits(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.MANUAL_EDITS);
    localStorage.removeItem(STORAGE_KEYS.REKON_STATUS);
    localStorage.removeItem(STORAGE_KEYS.REKON_NOTES);
    localStorage.removeItem(STORAGE_KEYS.KAB_FLAGS);
    localStorage.removeItem(STORAGE_KEYS.KAB_NOTES);
    localStorage.removeItem(STORAGE_KEYS.QUARTER_ENTRIES);
  } catch (e) {
    console.error('Failed to clear storage', e);
  }
  // Reset server state
  postToServer('/api/rekon/reset', {});
}

export function clearAllCustomUploads(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_BERJALAN);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_LALU);
    localStorage.removeItem(STORAGE_KEYS.UPLOAD_META);
  } catch (e) {
    console.error('Failed to clear custom uploads', e);
  }
}

export function getStoredDummyConfig(): DummyGeneratorConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DUMMY_CONFIG);
    return raw ? JSON.parse(raw) : { seed: 202701, pctHighIncrease: 0.35, pctSharpDecrease: 0.20 };
  } catch {
    return { seed: 202701, pctHighIncrease: 0.35, pctSharpDecrease: 0.20 };
  }
}

export function saveDummyConfig(cfg: DummyGeneratorConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DUMMY_CONFIG, JSON.stringify(cfg));
  } catch (e) {
    console.error('Failed to save dummy config', e);
  }
}
