#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const readline = require('readline');
const os = require('os');
const crypto = require('crypto');

const APP_DIR = path.join(os.homedir(), '.ai-renderer');
const CONFIG_PATH = path.join(APP_DIR, 'config.json');
const LOG_DIR = path.join(APP_DIR, 'logs');
const PENDING_FILE = path.join(APP_DIR, 'pending-queue.jsonl');
const CHUNK_SIZE = 1024 * 1024;
const REQUEST_TIMEOUT_MS = Number(process.env.AI_RENDERER_TIMEOUT_MS || 10000);

async function ensureAppDirs() {
  await fsp.mkdir(APP_DIR, { recursive: true });
  await fsp.mkdir(LOG_DIR, { recursive: true });
}

function filenameSafeTimestamp() {
  return new Date().toISOString().replace(/[.:]/g, '-');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const getArg = (flag, fallback = null) => {
    const i = args.indexOf(flag);
    if (i !== -1 && args[i + 1]) return args[i + 1];
    return fallback;
  };
  const hasFlag = (flag) => args.includes(flag);
  return { args, getArg, hasFlag };
}

const { args, getArg, hasFlag } = parseArgs(process.argv);

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { host: '127.0.0.1', port: 7788, session: 'default' };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

async function logError(error, context = {}) {
  try {
    await ensureAppDirs();
    const file = path.join(LOG_DIR, `error-${filenameSafeTimestamp()}.log`);
    const content = [
      `time: ${new Date().toISOString()}`,
      `argv: ${JSON.stringify(process.argv.slice(2))}`,
      `host: ${context.host || ''}`,
      `port: ${context.port || ''}`,
      `command: ${context.command || ''}`,
      `payload_meta: ${JSON.stringify(context.payloadMeta || {})}`,
      `error: ${error && error.message ? error.message : String(error)}`,
      `stack:`,
      error && error.stack ? error.stack : '(no stack)',
      '',
    ].join('\n');
    await fsp.writeFile(file, content, 'utf8');
  } catch {
    // avoid recursive logging failures
  }
}

function detectLang(filename) {
  const extMap = {
    '.py': 'python', '.js': 'javascript', '.ts': 'typescript',
    '.jsx': 'jsx', '.tsx': 'tsx', '.go': 'go', '.rs': 'rust',
    '.c': 'c', '.cpp': 'cpp', '.cs': 'csharp', '.java': 'java',
    '.rb': 'ruby', '.php': 'php', '.sh': 'bash', '.bash': 'bash',
    '.zsh': 'bash', '.fish': 'bash', '.json': 'json', '.yaml': 'yaml',
    '.yml': 'yaml', '.toml': 'toml', '.xml': 'xml', '.html': 'html',
    '.css': 'css', '.scss': 'scss', '.sql': 'sql', '.md': 'markdown',
    '.dockerfile': 'dockerfile', '.tf': 'hcl', '.lua': 'lua',
    '.r': 'r', '.swift': 'swift', '.kt': 'kotlin', '.dart': 'dart',
    '.doc': 'office', '.docx': 'office', '.xls': 'office', '.xlsx': 'office',
    '.ppt': 'office', '.pptx': 'office', '.odt': 'office', '.ods': 'office', '.odp': 'office',
  };
  const ext = path.extname(filename).toLowerCase();
  return extMap[ext] || 'plaintext';
}

function detectContentType(filename, lang, content) {
  const filenameExt = path.extname(filename).toLowerCase();
  const contentTypeLangMap = {
    'markdown': 'markdown', 'md': 'markdown', 'mdown': 'markdown',
    'json': 'json',
    'html': 'html', 'xml': 'html', 'svg': 'svg',
    'image': 'image', 'img': 'image',
    'pdf': 'pdf',
    'video': 'video', 'mp4': 'video', 'webm': 'video', 'mov': 'video', 'avi': 'video',
    'audio': 'audio', 'music': 'audio', 'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'aac': 'audio', 'm4a': 'audio',
    'model': 'model3d', 'model3d': 'model3d', 'gltf': 'model3d', 'glb': 'model3d',
    'office': 'office', 'docx': 'office', 'doc': 'office', 'xlsx': 'office', 'xls': 'office', 'pptx': 'office', 'ppt': 'office',
    'odt': 'office', 'ods': 'office', 'odp': 'office',
  };

  // Check by lang parameter
  if (lang && contentTypeLangMap[lang.toLowerCase()]) {
    return contentTypeLangMap[lang.toLowerCase()];
  }

  // Check by filename extension
  const extWithoutDot = filenameExt.slice(1).toLowerCase();
  if (contentTypeLangMap[extWithoutDot]) {
    return contentTypeLangMap[extWithoutDot];
  }

  // Check for office extensions
  if (/\.(doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)$/i.test(filename)) {
    return 'office';
  }

  // Check for image extensions
  if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(filename)) {
    return 'image';
  }

  // Check for video extensions
  if (/\.(mp4|webm|ogg|ogv|mov|avi|mkv|flv|m3u8)$/i.test(filename)) {
    return 'video';
  }

  // Check for audio extensions
  if (/\.(mp3|wav|ogg|oga|webm|aac|flac|m4a|wma)$/i.test(filename)) {
    return 'audio';
  }

  // Check for 3D model extensions
  if (/\.(gltf|glb|obj|fbx|dae|3ds)$/i.test(filename)) {
    return 'model3d';
  }

  // Check by content
  const trimmedContent = (content || '').trim();
  if (trimmedContent.startsWith('<svg') || filename.endsWith('.svg')) {
    return 'svg';
  }
  if (trimmedContent.startsWith('<') || trimmedContent.includes('<!DOCTYPE')) {
    return 'html';
  }
  if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
    try {
      JSON.parse(trimmedContent);
      return 'json';
    } catch {
      // Not JSON
    }
  }

  return 'code';
}

function requestJson({ host, port, pathName, method = 'GET', payload }) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const req = http.request({
      hostname: host,
      port,
      path: pathName,
      method,
      timeout: REQUEST_TIMEOUT_MS,
      headers: body
        ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          }
        : undefined,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try {
          resolve(JSON.parse(text));
        } catch {
          resolve({ ok: false, error: `Invalid JSON response: ${text.slice(0, 120)}` });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function appendPending(payload) {
  await ensureAppDirs();
  await fsp.appendFile(PENDING_FILE, `${JSON.stringify(payload)}\n`, 'utf8');
}

async function flushPending(host, port) {
  try {
    const raw = await fsp.readFile(PENDING_FILE, 'utf8');
    const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;

    const remaining = [];
    for (const line of lines) {
      let payload;
      try {
        payload = JSON.parse(line);
      } catch {
        continue;
      }
      try {
        const result = await pushPayload(payload, host, port);
        if (!result.ok) remaining.push(line);
      } catch {
        remaining.push(line);
      }
    }

    if (remaining.length) {
      await fsp.writeFile(PENDING_FILE, `${remaining.join('\n')}\n`, 'utf8');
    } else {
      await fsp.unlink(PENDING_FILE).catch(() => {});
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      await logError(error, { host, port, command: 'flushPending' });
    }
  }
}

async function pushChunked(payload, host, port) {
  const codeBuffer = Buffer.from(payload.code || '', 'utf8');
  const total = Math.ceil(codeBuffer.length / CHUNK_SIZE);
  const chunkId = crypto.randomUUID();

  for (let index = 0; index < total; index += 1) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, codeBuffer.length);
    const chunkB64 = codeBuffer.subarray(start, end).toString('base64');

    const result = await requestJson({
      host,
      port,
      pathName: '/api/push-chunk',
      method: 'POST',
      payload: {
        chunkId,
        index,
        total,
        chunkB64,
        lang: payload.lang,
        filename: payload.filename,
        label: payload.label,
        session: payload.session,
        contentType: payload.contentType,
        meta: payload.meta,
      },
    });

    if (!result.ok) {
      return result;
    }
  }

  return { ok: true };
}

async function pushPayload(payload, host, port) {
  if (Buffer.byteLength(payload.code || '', 'utf8') > CHUNK_SIZE) {
    return pushChunked(payload, host, port);
  }
  return requestJson({ host, port, pathName: '/api/push', method: 'POST', payload });
}

async function withPushFallback(payload, host, port, context = {}) {
  try {
    const result = await pushPayload(payload, host, port);
    if (!result.ok) {
      const err = new Error(result.error || 'Push failed');
      await logError(err, { host, port, command: 'push', payloadMeta: context.payloadMeta });
      await appendPending(payload);
    }
    return result;
  } catch (error) {
    await logError(error, { host, port, command: 'push', payloadMeta: context.payloadMeta });
    await appendPending(payload);
    return { ok: false, error: error.message };
  }
}

if (hasFlag('--help') || hasFlag('-h')) {
  const helpText = `
\x1b[1mai-push\x1b[0m — Send code to LLM Result Showcase

\x1b[33mUsage:\x1b[0m
  ai-push /path/to/file                Push a file by path
  ai-push --type markdown /path/to/file.md  Push markdown file
  ai-push --type office /path/to/file.docx  Push office file
  ai-push --clear                      Clear all history

\x1b[33mOptions:\x1b[0m
  --type,     -t  <type>     Content type (code, markdown, json, html, image, pdf, video, audio, svg, model3d, office)
  --label,    -L  <text>     Label/description for this block
  --session,  -s  <name>     Session name (default: 'default')
  --host,     -H  <host>     Server host (default: 127.0.0.1)
  --port,     -p  <port>     Server port (default: 7788)
  --clear                    Clear all code history in renderer
  --delete-last              Delete the last transmitted result
  --status                   Show server stats
  --config                   Save config (use with --host/--port/--session)
  --help                     Show this help

\x1b[33mEnv:\x1b[0m
  AI_RENDERER_TIMEOUT_MS     HTTP request timeout in milliseconds (default: 10000)
`;
  console.log(helpText);
  process.exit(0);
}

const cfg = loadConfig();
const HOST = getArg('--host') || getArg('-H') || cfg.host;
const PORT = Number(getArg('--port') || getArg('-p') || cfg.port);
const SESSION = getArg('--session') || getArg('-s') || cfg.session;
const TYPE = getArg('--type') || getArg('-t');

if (hasFlag('--config') || hasFlag('config')) {
  const next = { ...cfg };
  const host = getArg('--host') || getArg('-H');
  const port = getArg('--port') || getArg('-p');
  const session = getArg('--session') || getArg('-s');
  if (host) next.host = host;
  if (port) next.port = Number(port);
  if (session) next.session = session;
  ensureAppDirs().then(() => {
    saveConfig(next);
    console.log(`\x1b[32m✓\x1b[0m Config saved: ${JSON.stringify(next)}`);
  }).catch(async (error) => {
    await logError(error, { host: HOST, port: PORT, command: 'config' });
    console.error(`\x1b[31m✗\x1b[0m ${error.message}`);
    process.exit(1);
  });
  return;
}

if (hasFlag('--clear')) {
  requestJson({ host: HOST, port: PORT, pathName: '/api/clear', method: 'POST' })
    .then((res) => {
      if (res.ok) console.log('\x1b[32m✓\x1b[0m Cleared all history');
      else console.error(`\x1b[31m✗\x1b[0m ${res.error || 'Clear failed'}`);
    })
    .catch(async (error) => {
      await logError(error, { host: HOST, port: PORT, command: 'clear' });
      console.error(`\x1b[31m✗\x1b[0m Cannot reach server: ${error.message}`);
    });
  return;
}

if (hasFlag('--delete-last')) {
  requestJson({ host: HOST, port: PORT, pathName: '/api/delete-last', method: 'POST' })
    .then((res) => {
      if (res.ok) console.log('\x1b[32m✓\x1b[0m Deleted last history entry');
      else console.error(`\x1b[31m✗\x1b[0m ${res.error || 'Delete failed'}`);
    })
    .catch(async (error) => {
      await logError(error, { host: HOST, port: PORT, command: 'delete-last' });
      console.error(`\x1b[31m✗\x1b[0m Cannot reach server: ${error.message}`);
    });
  return;
}

if (hasFlag('--status')) {
  requestJson({ host: HOST, port: PORT, pathName: '/api/stats', method: 'GET' })
    .then((s) => {
      console.log('\x1b[36m● Server Status\x1b[0m');
      console.log(`  Clients:  ${s.clients || 0}`);
      console.log(`  History:  ${s.history || 0} blocks`);
      console.log(`  Uptime:   ${Math.floor(s.uptime || 0)}s`);
      console.log(`  Max:      ${s.maxHistory || 0}`);
    })
    .catch(async (error) => {
      await logError(error, { host: HOST, port: PORT, command: 'status' });
      console.error(`\x1b[31m✗\x1b[0m Cannot reach server: ${error.message}`);
    });
  return;
}

async function sendOne(payload, sourceLabel) {
  const res = await withPushFallback(payload, HOST, PORT, {
    payloadMeta: { source: sourceLabel, filename: payload.filename, lang: payload.lang },
  });
  if (!res.ok) {
    console.error(`\x1b[31m✗\x1b[0m ${res.error || 'push failed'} (cached for retry)`);
    return false;
  }
  return true;
}

async function main() {
  await ensureAppDirs();
  await flushPending(HOST, PORT);

  const fileArg = args.find((a) => !a.startsWith('-') && a !== getArg('--type') && a !== getArg('-t')
    && a !== getArg('--label') && a !== getArg('-L') && a !== getArg('--session')
    && a !== getArg('-s') && a !== getArg('--host') && a !== getArg('--port'));

  if (!fileArg || !fs.existsSync(fileArg)) {
    console.error('\x1b[31m✗\x1b[0m File path required. Use: ai-push <file>');
    process.exit(1);
  }

  const code = fs.readFileSync(fileArg, 'utf8');
  const filename = path.basename(fileArg);
  const lang = detectLang(fileArg);
  const label = getArg('--label') || getArg('-L') || '';
  const contentType = TYPE || detectContentType(filename, lang, code);

  const ok = await sendOne({
    lang,
    code,
    filename,
    label,
    session: SESSION,
    contentType,
    meta: { source: 'file' },
  }, 'file');

  if (ok) {
    console.log(`\x1b[32m✓\x1b[0m Pushed \x1b[1m${filename}\x1b[0m (${lang}, ${code.length} chars)`);
  }
}

main().catch(async (error) => {
  await logError(error, { host: HOST, port: PORT, command: 'main' });
  console.error(`\x1b[31m✗\x1b[0m ${error.message}`);
  process.exit(1);
});
