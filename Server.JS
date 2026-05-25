#!/usr/bin/env node
/**
 * AI Code Renderer - WebSocket + HTTP Server
 * CLI sends code → Server broadcasts → Web UI renders
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 7788;
const HOST = '0.0.0.0';

// In-memory store for sessions and code blocks
const sessions = new Map();
const codeHistory = [];
const MAX_HISTORY = 100;

// Get local IP
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

// MIME types
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// HTTP Server
const httpServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // API: receive code from CLI
  if (pathname === '/api/push' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const entry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          lang: payload.lang || 'plaintext',
          code: payload.code || '',
          filename: payload.filename || 'untitled',
          label: payload.label || '',
          session: payload.session || 'default',
          meta: payload.meta || {},
        };

        codeHistory.unshift(entry);
        if (codeHistory.length > MAX_HISTORY) codeHistory.pop();

        // Broadcast to all web clients
        broadcast({ type: 'code_block', data: entry });

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, id: entry.id }));
        
        console.log(`\x1b[32m[PUSH]\x1b[0m ${entry.filename} (${entry.lang}) ${entry.code.length}chars → broadcasted to ${wsClients.size} client(s)`);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // API: OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // API: get history
  if (pathname === '/api/history' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(codeHistory));
    return;
  }

  // API: clear history
  if (pathname === '/api/clear' && req.method === 'POST') {
    codeHistory.length = 0;
    broadcast({ type: 'clear' });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // API: stats
  if (pathname === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      clients: wsClients.size,
      history: codeHistory.length,
      uptime: process.uptime(),
    }));
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, '../public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 404 fallback to index
      if (pathname !== '/') {
        fs.readFile(path.join(__dirname, '../public/index.html'), (e, d) => {
          if (e) { res.writeHead(404); res.end('Not found'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(d);
        });
      } else {
        res.writeHead(404); res.end('Not found');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

// WebSocket Server
const wsClients = new Set();
const wss = new WebSocketServer({ server: httpServer });

function broadcast(msg) {
  const json = JSON.stringify(msg);
  wsClients.forEach(client => {
    if (client.readyState === 1) client.send(json);
  });
}

wss.on('connection', (ws, req) => {
  wsClients.add(ws);
  const ip = req.socket.remoteAddress;
  console.log(`\x1b[36m[WS]\x1b[0m Client connected (${ip}), total: ${wsClients.size}`);

  // Send history on connect
  ws.send(JSON.stringify({ type: 'history', data: codeHistory }));
  ws.send(JSON.stringify({ type: 'stats', data: { clients: wsClients.size } }));

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`\x1b[33m[WS]\x1b[0m Client disconnected, total: ${wsClients.size}`);
    broadcast({ type: 'stats', data: { clients: wsClients.size } });
  });

  ws.on('error', () => wsClients.delete(ws));
  broadcast({ type: 'stats', data: { clients: wsClients.size } });
});

// Start
httpServer.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log(`\n\x1b[1m\x1b[35m╔══════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m║     AI Code Renderer  v1.0           ║\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m╚══════════════════════════════════════╝\x1b[0m`);
  console.log(`\n  \x1b[32m●\x1b[0m Web UI:   \x1b[4mhttp://${localIP}:${PORT}\x1b[0m`);
  console.log(`  \x1b[32m●\x1b[0m Local:    \x1b[4mhttp://127.0.0.1:${PORT}\x1b[0m`);
  console.log(`  \x1b[32m●\x1b[0m Push API: POST http://127.0.0.1:${PORT}/api/push`);
  console.log(`\n  Use \x1b[33mai-push\x1b[0m CLI to send code blocks\n`);
});
