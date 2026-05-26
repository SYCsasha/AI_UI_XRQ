#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 7788);
const HOST = '0.0.0.0';
const MAX_HISTORY = Number(process.env.MAX_HISTORY || 200);
const INITIAL_PAGE_SIZE = Number(process.env.INITIAL_PAGE_SIZE || 50);
const CHUNK_MAX_BYTES = 1024 * 1024;
const CHUNK_RECORD_TTL_MS = 5 * 60 * 1000;
const PERSIST_DEBOUNCE_MS = 120;
const WS_HEARTBEAT_MS = Number(process.env.WS_HEARTBEAT_MS || 30000);
const STORAGE_DIR = path.join(os.homedir(), '.ai-renderer');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

class LRUCache {
  constructor(limit) {
    this.limit = Math.max(10, Number(limit) || 200);
    this.map = new Map();
  }

  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.limit) {
      const first = this.map.keys().next().value;
      this.map.delete(first);
    }
  }

  get(key) {
    if (!this.map.has(key)) return null;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  clear() {
    this.map.clear();
  }

  delete(key) {
    this.map.delete(key);
  }
}

const codeHistory = [];
const historyCache = new LRUCache(MAX_HISTORY);
const wsClients = new Set();
const chunkStore = new Map();
let persistTimer = null;

function nowISO() {
  return new Date().toISOString();
}

async function ensureStorageDir() {
  await fsp.mkdir(STORAGE_DIR, { recursive: true });
}

async function loadHistory() {
  try {
    await ensureStorageDir();
    const raw = await fsp.readFile(HISTORY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    parsed.slice(0, MAX_HISTORY).forEach((item) => {
      codeHistory.push(item);
      historyCache.set(item.id, item);
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`[WARN] Failed to load history: ${error.message}`);
    }
  }
}

function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    try {
      await ensureStorageDir();
      const tempPath = `${HISTORY_FILE}.tmp`;
      await fsp.writeFile(tempPath, JSON.stringify(codeHistory, null, 2), 'utf8');
      await fsp.rename(tempPath, HISTORY_FILE);
    } catch (error) {
      console.error(`[WARN] Failed to persist history: ${error.message}`);
    }
  }, PERSIST_DEBOUNCE_MS);
}

function trimHistory() {
  while (codeHistory.length > MAX_HISTORY) {
    const removed = codeHistory.pop();
    if (removed?.id) historyCache.delete(removed.id);
  }
}

function addHistoryEntry(entry) {
  codeHistory.unshift(entry);
  historyCache.set(entry.id, entry);
  trimHistory();
  schedulePersist();
}

function clearHistoryStore() {
  codeHistory.length = 0;
  historyCache.clear();
  schedulePersist();
}

function getHistoryPage(offset = 0, limit = INITIAL_PAGE_SIZE) {
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.min(MAX_HISTORY, Math.max(1, Number(limit) || INITIAL_PAGE_SIZE));
  const items = codeHistory.slice(safeOffset, safeOffset + safeLimit);
  items.forEach((item) => historyCache.set(item.id, item));
  return {
    items,
    offset: safeOffset,
    limit: safeLimit,
    total: codeHistory.length,
    hasMore: safeOffset + safeLimit < codeHistory.length,
  };
}

function getSafeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'untitled';
  return filename.replace(/[\\/\0]/g, '_').slice(0, 255) || 'untitled';
}

function makeEntry(payload) {
  const code = typeof payload.code === 'string' ? payload.code : '';
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: nowISO(),
    lang: payload.lang || 'plaintext',
    code,
    filename: getSafeFilename(payload.filename),
    label: payload.label || '',
    session: payload.session || 'default',
    meta: {
      ...(payload.meta || {}),
      contentType: payload.contentType || payload.meta?.contentType,
    },
  };
}

function parseJsonBody(req, limitBytes = 3 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(req, res, statusCode, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extraHeaders,
  };

  const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (acceptsGzip && body.length > 512) {
    const compressed = zlib.gzipSync(body);
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
    headers['Content-Length'] = compressed.length;
    res.writeHead(statusCode, headers);
    res.end(compressed);
    return;
  }

  headers['Content-Length'] = body.length;
  res.writeHead(statusCode, headers);
  res.end(body);
}

function sendText(req, res, statusCode, data, contentType = 'text/plain; charset=utf-8') {
  const body = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
  const headers = { 'Content-Type': contentType, 'Content-Length': body.length };
  res.writeHead(statusCode, headers);
  res.end(body);
}

function broadcast(msg) {
  const json = JSON.stringify(msg);
  wsClients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(json);
      } catch {
        ws.terminate();
      }
    }
  });
}

function broadcastStats() {
  broadcast({ type: 'stats', data: { clients: wsClients.size, history: codeHistory.length } });
}

function handleChunkPush(payload) {
  const chunkId = String(payload.chunkId || '');
  const index = Number(payload.index);
  const total = Number(payload.total);
  const chunkB64 = payload.chunkB64;

  if (!chunkId || !Number.isInteger(index) || !Number.isInteger(total) || total <= 0 || index < 0 || index >= total) {
    throw new Error('Invalid chunk metadata');
  }
  if (typeof chunkB64 !== 'string') throw new Error('Missing chunk content');

  const chunkBuffer = Buffer.from(chunkB64, 'base64');
  if (!chunkBuffer.length || chunkBuffer.length > CHUNK_MAX_BYTES) {
    throw new Error('Invalid chunk size');
  }

  const key = `${payload.session || 'default'}:${chunkId}`;
  let record = chunkStore.get(key);
  if (!record) {
    record = {
      total,
      chunks: new Array(total),
      createdAt: Date.now(),
      lang: payload.lang,
      filename: payload.filename,
      label: payload.label,
      session: payload.session,
      contentType: payload.contentType,
      meta: payload.meta || {},
    };
    chunkStore.set(key, record);
  }

  if (record.total !== total) throw new Error('Chunk total mismatch');

  record.chunks[index] = chunkBuffer;
  record.createdAt = Date.now();

  const received = record.chunks.filter(Boolean).length;
  const complete = received === total;

  if (!complete) {
    return { complete: false, received, total };
  }

  const code = Buffer.concat(record.chunks).toString('utf8');
  const entry = makeEntry({
    lang: record.lang,
    code,
    filename: record.filename,
    label: record.label,
    session: record.session,
    contentType: record.contentType,
    meta: { ...record.meta, chunked: true, chunks: total },
  });

  chunkStore.delete(key);
  addHistoryEntry(entry);
  broadcast({ type: 'code_block', data: entry });

  return { complete: true, id: entry.id };
}

const publicDir = path.resolve(__dirname, '../public');

const httpServer = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (req.method === 'OPTIONS') {
      sendJson(req, res, 204, {});
      return;
    }

    if (pathname === '/api/push' && req.method === 'POST') {
      const payload = await parseJsonBody(req, 4 * 1024 * 1024);
      const entry = makeEntry(payload);
      addHistoryEntry(entry);
      broadcast({ type: 'code_block', data: entry });
      sendJson(req, res, 200, { ok: true, id: entry.id });
      return;
    }

    if (pathname === '/api/push-chunk' && req.method === 'POST') {
      const payload = await parseJsonBody(req, 2 * 1024 * 1024);
      const result = handleChunkPush(payload);
      sendJson(req, res, 200, { ok: true, ...result });
      return;
    }

    if (pathname === '/api/history' && req.method === 'GET') {
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || INITIAL_PAGE_SIZE);
      sendJson(req, res, 200, { ok: true, ...getHistoryPage(offset, limit) });
      return;
    }

    if (pathname === '/api/clear' && req.method === 'POST') {
      clearHistoryStore();
      broadcast({ type: 'clear' });
      sendJson(req, res, 200, { ok: true });
      return;
    }

    if (pathname === '/api/delete-last' && req.method === 'POST') {
      if (codeHistory.length > 0) {
        const removed = codeHistory.pop();
        if (removed && removed.id) {
          historyCache.delete(removed.id);
        }
        schedulePersist();
        const deletedId = removed && removed.id ? removed.id : null;
        broadcast({ type: 'delete_last', data: { id: deletedId } });
        sendJson(req, res, 200, { ok: true, deleted: deletedId });
      } else {
        sendJson(req, res, 200, { ok: false, error: 'No history to delete' });
      }
      return;
    }

    if (pathname === '/api/stats' && req.method === 'GET') {
      sendJson(req, res, 200, {
        ok: true,
        clients: wsClients.size,
        history: codeHistory.length,
        uptime: process.uptime(),
        maxHistory: MAX_HISTORY,
      });
      return;
    }

    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.resolve(publicDir, `.${requestedPath}`);
    if (!filePath.startsWith(publicDir)) {
      sendText(req, res, 403, 'Forbidden');
      return;
    }

    try {
      const data = await fsp.readFile(filePath);
      sendText(req, res, 200, data, MIME[path.extname(filePath)] || 'application/octet-stream');
      return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      try {
        const html = await fsp.readFile(path.join(publicDir, 'index.html'));
        sendText(req, res, 200, html, 'text/html; charset=utf-8');
      } catch {
        sendText(req, res, 404, 'Not found');
      }
    }
  } catch (error) {
    sendJson(req, res, 500, { ok: false, error: error.message });
  }
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  wsClients.add(ws);

  const page = getHistoryPage(0, INITIAL_PAGE_SIZE);
  ws.send(JSON.stringify({ type: 'history', data: page.items, paging: { total: page.total, hasMore: page.hasMore, offset: page.offset, limit: page.limit } }));
  ws.send(JSON.stringify({ type: 'stats', data: { clients: wsClients.size, history: codeHistory.length } }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
      }
    } catch {
      // ignore bad messages
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    broadcastStats();
  });

  ws.on('error', () => {
    wsClients.delete(ws);
    broadcastStats();
  });

  broadcastStats();
});

setInterval(() => {
  wsClients.forEach((ws) => {
    if (!ws.isAlive) {
      wsClients.delete(ws);
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
  broadcastStats();
}, WS_HEARTBEAT_MS);

setInterval(() => {
  const now = Date.now();
  chunkStore.forEach((record, key) => {
    if (now - record.createdAt > CHUNK_RECORD_TTL_MS) {
      chunkStore.delete(key);
    }
  });
}, 60 * 1000);

(async () => {
  await loadHistory();
  httpServer.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    console.log(`\nAI Code Renderer running`);
    console.log(`  Web UI:   http://${localIP}:${PORT}`);
    console.log(`  Local:    http://127.0.0.1:${PORT}`);
    console.log(`  Push API: POST http://127.0.0.1:${PORT}/api/push`);
    console.log(`  Max history: ${MAX_HISTORY}`);
  });
})();
