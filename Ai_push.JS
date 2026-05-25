#!/usr/bin/env node
/**
 * ai-push — CLI tool to send code blocks to AI Code Renderer
 * 
 * Usage:
 *   ai-push [options] [file]
 *   echo "code" | ai-push --lang python --label "My Script"
 *   ai-push main.py --label "Entry point"
 *   ai-push --lang json --label "Config" < config.json
 *   ai-push --stream --lang python   # stream mode, line by line
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

// Config file path
const CONFIG_PATH = path.join(os.homedir(), '.ai-renderer.json');

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

// Parse args
const args = process.argv.slice(2);

function getArg(flag, fallback = null) {
  const i = args.indexOf(flag);
  if (i !== -1 && args[i + 1]) return args[i + 1];
  return fallback;
}

function hasFlag(flag) {
  return args.includes(flag);
}

// Commands
if (hasFlag('--config') || hasFlag('config')) {
  const host = getArg('--host') || getArg('-h');
  const port = getArg('--port') || getArg('-p');
  const session = getArg('--session') || getArg('-s');
  const cfg = loadConfig();
  if (host) cfg.host = host;
  if (port) cfg.port = parseInt(port);
  if (session) cfg.session = session;
  saveConfig(cfg);
  console.log(`\x1b[32m✓\x1b[0m Config saved: ${JSON.stringify(cfg)}`);
  process.exit(0);
}

if (hasFlag('--help') || hasFlag('-h') && args.length === 1) {
  console.log(`
\x1b[1mai-push\x1b[0m — Send code to AI Code Renderer

\x1b[33mUsage:\x1b[0m
  ai-push [file]                     Push a file
  echo "code" | ai-push              Push stdin
  ai-push --lang py --stream         Stream stdin line-by-line

\x1b[33mOptions:\x1b[0m
  --lang,     -l  <lang>     Language (python, js, bash, json, ...)
  --label,    -L  <text>     Label/description for this block
  --filename, -f  <name>     Override filename shown in UI
  --session,  -s  <name>     Session name (default: 'default')
  --host          <host>     Server host (default: 127.0.0.1)
  --port          <port>     Server port (default: 7788)
  --stream                   Stream mode: send each line as it arrives
  --clear                    Clear all code history in renderer
  --status                   Show server stats
  --config                   Save config (use with --host/--port/--session)
  --help                     Show this help

\x1b[33mExamples:\x1b[0m
  ai-push script.py
  cat main.go | ai-push --lang go --label "Main package"
  ai-push --lang bash --label "Deploy script" deploy.sh
  ai-push --clear
  ai-push --status
`);
  process.exit(0);
}

const cfg = loadConfig();
const HOST = getArg('--host') || cfg.host;
const PORT = parseInt(getArg('--port') || cfg.port);
const SESSION = getArg('--session') || getArg('-s') || cfg.session;
const LANG = getArg('--lang') || getArg('-l');
const LABEL = getArg('--label') || getArg('-L') || '';
const FILENAME_OPT = getArg('--filename') || getArg('-f');
const STREAM = hasFlag('--stream');

// Detect lang from extension
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
  };
  const ext = path.extname(filename).toLowerCase();
  return extMap[ext] || 'plaintext';
}

function push(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/api/push',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ ok: false, error: 'parse error' }); }
      });
    });

    req.on('error', err => reject(err));
    req.write(body);
    req.end();
  });
}

// --clear
if (hasFlag('--clear')) {
  const options = { hostname: HOST, port: PORT, path: '/api/clear', method: 'POST' };
  const req = http.request(options, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log(`\x1b[32m✓\x1b[0m Cleared all history`));
  });
  req.on('error', e => console.error(`\x1b[31m✗\x1b[0m Cannot reach server: ${e.message}`));
  req.end();
  return;
}

// --status
if (hasFlag('--status')) {
  http.get(`http://${HOST}:${PORT}/api/stats`, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try {
        const s = JSON.parse(d);
        console.log(`\x1b[36m● Server Status\x1b[0m`);
        console.log(`  Clients:  ${s.clients}`);
        console.log(`  History:  ${s.history} blocks`);
        console.log(`  Uptime:   ${Math.floor(s.uptime)}s`);
      } catch { console.log(d); }
    });
  }).on('error', e => console.error(`\x1b[31m✗\x1b[0m Cannot reach server: ${e.message}`));
  return;
}

// Get file arg (non-flag arg)
const fileArg = args.find(a => !a.startsWith('-') && a !== getArg('--lang') && a !== getArg('-l')
  && a !== getArg('--label') && a !== getArg('-L') && a !== getArg('--filename')
  && a !== getArg('-f') && a !== getArg('--session') && a !== getArg('-s')
  && a !== getArg('--host') && a !== getArg('--port'));

async function main() {
  // Stream mode: send each line as it arrives
  if (STREAM) {
    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    let lineNum = 0;
    for await (const line of rl) {
      lineNum++;
      try {
        await push({
          lang: LANG || 'plaintext',
          code: line,
          filename: FILENAME_OPT || `stream-line-${lineNum}`,
          label: LABEL || `Line ${lineNum}`,
          session: SESSION,
          meta: { stream: true, lineNum },
        });
        process.stdout.write(`\x1b[32m·\x1b[0m`);
      } catch (e) {
        process.stderr.write(`\x1b[31m✗\x1b[0m`);
      }
    }
    console.log(`\n\x1b[32m✓\x1b[0m Streamed ${lineNum} lines`);
    return;
  }

  // File mode
  if (fileArg && fs.existsSync(fileArg)) {
    const code = fs.readFileSync(fileArg, 'utf8');
    const filename = FILENAME_OPT || path.basename(fileArg);
    const lang = LANG || detectLang(fileArg);
    try {
      const r = await push({ lang, code, filename, label: LABEL, session: SESSION, meta: { source: 'file' } });
      if (r.ok) console.log(`\x1b[32m✓\x1b[0m Pushed \x1b[1m${filename}\x1b[0m (${lang}, ${code.length} chars) → id:${r.id}`);
      else console.error(`\x1b[31m✗\x1b[0m Error: ${r.error}`);
    } catch (e) {
      console.error(`\x1b[31m✗\x1b[0m Cannot reach renderer at ${HOST}:${PORT} — ${e.message}`);
    }
    return;
  }

  // Stdin mode
  if (!process.stdin.isTTY || !fileArg) {
    const chunks = [];
    process.stdin.on('data', d => chunks.push(d));
    process.stdin.on('end', async () => {
      const code = Buffer.concat(chunks).toString('utf8').trimEnd();
      if (!code) { console.error('\x1b[31m✗\x1b[0m No input received'); process.exit(1); }
      const filename = FILENAME_OPT || 'stdin';
      const lang = LANG || 'plaintext';
      try {
        const r = await push({ lang, code, filename, label: LABEL, session: SESSION, meta: { source: 'stdin' } });
        if (r.ok) console.log(`\x1b[32m✓\x1b[0m Pushed stdin (${lang}, ${code.length} chars) → id:${r.id}`);
        else console.error(`\x1b[31m✗\x1b[0m Error: ${r.error}`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m Cannot reach renderer at ${HOST}:${PORT} — ${e.message}`);
      }
    });
    return;
  }

  console.error('\x1b[31m✗\x1b[0m No input. Use: ai-push <file> or echo "code" | ai-push');
  process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
