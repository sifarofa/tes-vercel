/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.resolve(__dirname, 'server_data');
const STATE_FILE = path.join(DATA_DIR, 'rekon_state.json');

// Ensure storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface ServerRekonState {
  statuses: Record<string, string>;
  notes: Record<string, string>;
  kabFlags: Record<string, boolean>;
  kabNotes: Record<string, string>;
  manualEdits: Record<string, any>;
  lastUpdated: string;
}

function loadState(): ServerRekonState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        statuses: parsed.statuses || {},
        notes: parsed.notes || {},
        kabFlags: parsed.kabFlags || {},
        kabNotes: parsed.kabNotes || {},
        manualEdits: parsed.manualEdits || {},
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      };
    }
  } catch (err) {
    console.error('Error reading server state file:', err);
  }
  return {
    statuses: {},
    notes: {},
    kabFlags: {},
    kabNotes: {},
    manualEdits: {},
    lastUpdated: new Date().toISOString()
  };
}

function saveState(state: ServerRekonState): void {
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server state file:', err);
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'RekonIKK Server',
      timestamp: new Date().toISOString()
    });
  });

  // GET: Fetch current persisted reconciliation state
  app.get('/api/rekon/state', (_req, res) => {
    const state = loadState();
    res.json({
      success: true,
      data: state
    });
  });

  // POST: Update status rekon for a respondent item
  app.post('/api/rekon/status', (req, res) => {
    const { id, status } = req.body;
    if (!id || !status) {
      return res.status(400).json({ success: false, error: 'id and status are required' });
    }
    const state = loadState();
    state.statuses[id] = status;
    saveState(state);
    res.json({
      success: true,
      message: `Status for ${id} updated to ${status}`,
      lastUpdated: state.lastUpdated
    });
  });

  // POST: Update reconciliation note for a respondent item
  app.post('/api/rekon/note', (req, res) => {
    const { id, note } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id is required' });
    }
    const state = loadState();
    if (note && String(note).trim()) {
      state.notes[id] = String(note).trim();
    } else {
      delete state.notes[id];
    }
    saveState(state);
    res.json({
      success: true,
      message: `Note for ${id} saved`,
      lastUpdated: state.lastUpdated
    });
  });

  // POST: Save manual price edit
  app.post('/api/rekon/manual-edit', (req, res) => {
    const { id, edit } = req.body;
    if (!id || !edit) {
      return res.status(400).json({ success: false, error: 'id and edit payload are required' });
    }
    const state = loadState();
    state.manualEdits[id] = {
      ...edit,
      updatedAt: new Date().toISOString()
    };
    if (edit.catatan && String(edit.catatan).trim()) {
      state.notes[id] = String(edit.catatan).trim();
    }
    saveState(state);
    res.json({
      success: true,
      message: `Manual edit for ${id} saved`,
      data: state.manualEdits[id],
      lastUpdated: state.lastUpdated
    });
  });

  // POST: Toggle or set flag for Kabupaten/Kota
  app.post('/api/rekon/kab-flag', (req, res) => {
    const { kualitasKey, kodeKab, isFlagged } = req.body;
    if (!kualitasKey || !kodeKab) {
      return res.status(400).json({ success: false, error: 'kualitasKey and kodeKab are required' });
    }
    const key = `${kualitasKey}_${kodeKab}`;
    const state = loadState();
    if (typeof isFlagged === 'boolean') {
      state.kabFlags[key] = isFlagged;
    } else {
      state.kabFlags[key] = !state.kabFlags[key];
    }
    saveState(state);
    res.json({
      success: true,
      key,
      isFlagged: state.kabFlags[key],
      lastUpdated: state.lastUpdated
    });
  });

  // POST: Save note for Kabupaten/Kota in RekonDaerah view
  app.post('/api/rekon/kab-note', (req, res) => {
    const { kualitasKey, kodeKab, note } = req.body;
    if (!kualitasKey || !kodeKab) {
      return res.status(400).json({ success: false, error: 'kualitasKey and kodeKab are required' });
    }
    const key = `${kualitasKey}_${kodeKab}`;
    const state = loadState();
    if (note && String(note).trim()) {
      state.kabNotes[key] = String(note).trim();
    } else {
      delete state.kabNotes[key];
    }
    saveState(state);
    res.json({
      success: true,
      key,
      note: state.kabNotes[key],
      lastUpdated: state.lastUpdated
    });
  });

  // POST: Batch synchronization from client
  app.post('/api/rekon/batch-sync', (req, res) => {
    const { statuses, notes, kabFlags, kabNotes, manualEdits } = req.body;
    const state = loadState();
    if (statuses && typeof statuses === 'object') {
      Object.assign(state.statuses, statuses);
    }
    if (notes && typeof notes === 'object') {
      Object.assign(state.notes, notes);
    }
    if (kabFlags && typeof kabFlags === 'object') {
      Object.assign(state.kabFlags, kabFlags);
    }
    if (kabNotes && typeof kabNotes === 'object') {
      Object.assign(state.kabNotes, kabNotes);
    }
    if (manualEdits && typeof manualEdits === 'object') {
      Object.assign(state.manualEdits, manualEdits);
    }
    saveState(state);
    res.json({
      success: true,
      data: state,
      lastUpdated: state.lastUpdated
    });
  });

  // POST: Reset all server rekon state
  app.post('/api/rekon/reset', (_req, res) => {
    const freshState: ServerRekonState = {
      statuses: {},
      notes: {},
      kabFlags: {},
      kabNotes: {},
      manualEdits: {},
      lastUpdated: new Date().toISOString()
    };
    saveState(freshState);
    res.json({
      success: true,
      message: 'Server state has been successfully reset'
    });
  });

  // Development vs Production serving
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RekonIKK Server] Running on http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[RekonIKK Server] Failed to start:', err);
  process.exit(1);
});
