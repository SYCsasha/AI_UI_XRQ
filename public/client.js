const PAGE_SIZE = 50;
const SCROLL_THRESHOLD_PX = 80;
const FALLBACK_POLL_PAGE_SIZE = 10;
const LOCAL_HISTORY_KEY = 'ai_renderer_history_v1';
const THEME_KEY = 'ai_renderer_theme';
const WS_URL = `ws://${location.host}`;

let ws = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let heartbeatTimer = null;
let fallbackPollTimer = null;

let blocks = [];
let selectedId = null;
let loadedOffset = 0;
let hasMore = true;
let loadingPage = false;
let officeBlocks = [];
let selectedOfficeId = null;

// New UI state
let currentFile = 'html'; // html, png, json, office
let htmlMode = 'preview'; // preview or code

function escHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function saveLocalHistory() {
  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(blocks.slice(0, 200)));
  } catch {
    // ignore storage quota errors
  }
}

function loadLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length) {
      blocks = parsed;
      selectedId = parsed[0].id;
      renderFileDirectory();
      renderCurrent();
    }
  } catch {
    // ignore parse errors
  }
}

function mergeBlocks(items, append = false) {
  if (!append) {
    blocks = [];
  }

  const map = new Map(blocks.map((item) => [item.id, item]));
  items.forEach((item) => map.set(item.id, item));
  blocks = Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (!selectedId && blocks.length) selectedId = blocks[0].id;
  if (selectedId && !blocks.find((item) => item.id === selectedId)) {
    selectedId = blocks[0]?.id || null;
  }

  // Separate office files
  officeBlocks = blocks.filter(b => b.meta?.contentType === 'office' || isOfficeFile(b.filename));
  if (!selectedOfficeId && officeBlocks.length) selectedOfficeId = officeBlocks[0].id;
  
  saveLocalHistory();
  renderFileDirectory();
  renderCurrent();
}

function selectedBlock() {
  return blocks.find((item) => item.id === selectedId) || null;
}

function selectedOfficeBlock() {
  return officeBlocks.find((item) => item.id === selectedOfficeId) || null;
}

function isOfficeFile(filename) {
  const officeExts = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return officeExts.includes(ext);
}

function detectFileType(filename) {
  if (!filename) return 'html';
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  // Image types
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)) return 'png';
  
  // JSON/Data types
  if (['.json', '.yaml', '.yml', '.toml', '.csv'].includes(ext)) return 'json';
  
  // Office types
  if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'].includes(ext)) return 'office';
  
  // Default to HTML/Code
  return 'html';
}

function renderFileDirectory() {
  const fileDir = document.getElementById('fileDirectory');
  if (!fileDir) return;

  // Clear existing items except the template buttons
  const buttons = fileDir.querySelectorAll('button');
  buttons.forEach(btn => btn.remove());

  // Add items from blocks
  blocks.slice(0, 10).forEach((block) => {
    const btn = document.createElement('button');
    const fileType = detectFileType(block.filename);
    const icon = getFileIcon(fileType);
    const isSelected = block.id === selectedId;
    
    btn.className = `w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group text-left ${
      isSelected 
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
        : 'hover:bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent'
    }`;
    
    btn.innerHTML = `
      <div class="flex items-center space-x-2.5 truncate">
        <i class="${icon} text-sm group-hover:scale-110 transition-transform"></i>
        <span class="text-xs font-medium truncate">${escHtml(block.filename || 'untitled')}</span>
      </div>
      <i class="fa-solid fa-chevron-right text-[10px] ${isSelected ? 'opacity-60' : 'opacity-0 group-hover:opacity-60'} transition-opacity"></i>
    `;
    
    btn.addEventListener('click', () => {
      selectedId = block.id;
      currentFile = fileType;
      renderFileDirectory();
      renderCurrent();
    });
    
    fileDir.appendChild(btn);
  });
}

function getFileIcon(fileType) {
  const icons = {
    'html': 'fa-brands fa-html5 text-orange-500',
    'png': 'fa-solid fa-image text-purple-400',
    'json': 'fa-solid fa-square-poll-horizontal text-sky-400',
    'office': 'fa-solid fa-file-word text-blue-500'
  };
  return icons[fileType] || icons['html'];
}

function renderCurrent() {
  const block = selectedBlock();
  
  // Show placeholder when no block selected
  if (!block) {
    document.getElementById('panel-html-render').classList.remove('hidden');
    document.getElementById('panel-html-code').classList.add('hidden');
    document.getElementById('panel-png').classList.add('hidden');
    document.getElementById('panel-json').classList.add('hidden');
    return;
  }

  // Determine what to display based on file type or selection
  const fileType = detectFileType(block.filename);
  
  if (fileType === 'png' || currentFile === 'png') {
    renderImagePanel(block);
  } else if (fileType === 'json' || currentFile === 'json') {
    renderJsonPanel(block);
  } else if (fileType === 'office' || currentFile === 'office') {
    renderOfficePanel(block);
  } else {
    renderCodePanel(block);
  }
}

function renderCodePanel(block) {
  document.getElementById('panel-html-render').classList.add('hidden');
  document.getElementById('panel-html-code').classList.add('hidden');
  document.getElementById('panel-png').classList.add('hidden');
  document.getElementById('panel-json').classList.add('hidden');

  if (htmlMode === 'preview') {
    document.getElementById('panel-html-render').classList.remove('hidden');
    const renderContent = document.getElementById('panel-html-render');
    if (rendererDispatcher && rendererDispatcher.render) {
      rendererDispatcher.render(block, renderContent);
    }
  } else {
    document.getElementById('panel-html-code').classList.remove('hidden');
    const codePane = document.getElementById('panel-html-code');
    if (codePane) {
      const preEl = codePane.querySelector('pre');
      if (preEl) {
        preEl.textContent = block.code || '// No code available';
        // Apply syntax highlighting if available
        if (window.hljs) {
          preEl.classList.add('language-' + (block.lang || 'plaintext'));
          hljs.highlightElement(preEl);
        }
      }
    }
  }
}

function renderImagePanel(block) {
  document.getElementById('panel-html-render').classList.add('hidden');
  document.getElementById('panel-html-code').classList.add('hidden');
  document.getElementById('panel-png').classList.remove('hidden');
  document.getElementById('panel-json').classList.add('hidden');

  const imgPanel = document.getElementById('panel-png');
  if (imgPanel && rendererDispatcher && rendererDispatcher.render) {
    rendererDispatcher.render(block, imgPanel);
  }
}

function renderJsonPanel(block) {
  document.getElementById('panel-html-render').classList.add('hidden');
  document.getElementById('panel-html-code').classList.add('hidden');
  document.getElementById('panel-png').classList.add('hidden');
  document.getElementById('panel-json').classList.remove('hidden');

  const jsonPanel = document.getElementById('panel-json');
  if (jsonPanel && rendererDispatcher && rendererDispatcher.render) {
    rendererDispatcher.render(block, jsonPanel);
  }
}

function renderOfficePanel(block) {
  // Office panel - placeholder implementation
  document.getElementById('panel-html-render').classList.add('hidden');
  document.getElementById('panel-html-code').classList.add('hidden');
  document.getElementById('panel-png').classList.add('hidden');
  document.getElementById('panel-json').classList.remove('hidden');

  const jsonPanel = document.getElementById('panel-json');
  if (jsonPanel) {
    jsonPanel.innerHTML = `
      <div class="flex items-center justify-between border-b border-gray-800 pb-3">
        <span class="text-xs font-semibold text-gray-300">办公文件预览</span>
        <span class="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono">${escHtml(block.lang || 'OFFICE')}</span>
      </div>
      <div class="grid grid-cols-1 gap-4 mt-4">
        <div class="bg-black/30 p-4 rounded-xl border border-gray-800/40">
          <div class="text-[10px] text-gray-500 uppercase tracking-wider">文件名称</div>
          <div class="text-sm font-bold text-white mt-2">${escHtml(block.filename || 'untitled')}</div>
        </div>
        <div class="bg-black/30 p-4 rounded-xl border border-gray-800/40">
          <div class="text-[10px] text-gray-500 uppercase tracking-wider">文件类型</div>
          <div class="text-sm font-bold text-white mt-2">${escHtml(block.lang || 'Office Document')}</div>
        </div>
        <div class="bg-black/30 p-4 rounded-xl border border-gray-800/40">
          <div class="text-[10px] text-gray-500 uppercase tracking-wider">修改时间</div>
          <div class="text-sm font-bold text-white mt-2">${new Date(block.timestamp).toLocaleString('zh-CN', { hour12: false })}</div>
        </div>
      </div>
    `;
  }
}

async function fetchHistoryPage(offset, limit = PAGE_SIZE, append = true) {
  if (loadingPage) return;
  loadingPage = true;
  try {
    const res = await fetch(`/api/history?offset=${offset}&limit=${limit}`);
    if (!res.ok) return;
    const json = await res.json();
    if (!json.ok) return;
    hasMore = json.hasMore;
    loadedOffset = json.offset + json.items.length;
    mergeBlocks(json.items, append);
  } finally {
    loadingPage = false;
  }
}

function setupInfiniteScroll() {
  const fileDir = document.getElementById('fileDirectory');
  if (!fileDir) return;
  fileDir.addEventListener('scroll', () => {
    if (!hasMore || loadingPage) return;
    const nearBottom = fileDir.scrollTop + fileDir.clientHeight >= fileDir.scrollHeight - SCROLL_THRESHOLD_PX;
    if (nearBottom) {
      fetchHistoryPage(loadedOffset, PAGE_SIZE, true);
    }
  });
}

function startFallbackPolling() {
  stopFallbackPolling();
  fallbackPollTimer = setInterval(() => {
    fetchHistoryPage(0, FALLBACK_POLL_PAGE_SIZE, false);
  }, 4000);
}

function stopFallbackPolling() {
  if (fallbackPollTimer) {
    clearInterval(fallbackPollTimer);
    fallbackPollTimer = null;
  }
}

function setupWsHeartbeat() {
  clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping', time: Date.now() }));
    }
  }, 15000);
}

function connectWs() {
  clearTimeout(reconnectTimer);

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    reconnectAttempts = 0;
    setupWsHeartbeat();
    stopFallbackPolling();
  };

  ws.onmessage = (event) => {
    let msg = null;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === 'history') {
      const paging = msg.paging || {};
      loadedOffset = (paging.offset || 0) + (msg.data?.length || 0);
      hasMore = Boolean(paging.hasMore);
      mergeBlocks(msg.data || [], false);
      return;
    }

    if (msg.type === 'code_block') {
      mergeBlocks([msg.data], true);
      return;
    }

    if (msg.type === 'clear') {
      blocks = [];
      selectedId = null;
      loadedOffset = 0;
      hasMore = false;
      saveLocalHistory();
      renderFileDirectory();
      renderCurrent();
      return;
    }

    if (msg.type === 'delete_last') {
      const deletedId = msg.data?.id;
      if (deletedId) {
        blocks = blocks.filter((b) => b.id !== deletedId);
        if (selectedId === deletedId) {
          selectedId = blocks[0]?.id || null;
        }
        saveLocalHistory();
        renderFileDirectory();
        renderCurrent();
      }
      return;
    }
  };

  ws.onclose = () => {
    clearInterval(heartbeatTimer);
    startFallbackPolling();
    reconnectAttempts += 1;
    const delay = Math.min(12000, 1000 * (2 ** Math.min(reconnectAttempts, 4)));
    reconnectTimer = setTimeout(connectWs, delay);
  };

  ws.onerror = () => {
    ws.close();
  };
}

function setupTouchBack() {
  let startX = 0;
  let startY = 0;

  window.addEventListener('touchstart', (e) => {
    const touch = e.changedTouches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (htmlMode !== 'code') return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = Math.abs(touch.clientY - startY);
    if (dx > 80 && dy < 40) {
      htmlMode = 'preview';
      renderCurrent();
    }
  }, { passive: true });
}

// Integration hooks for new UI functions
function switchFile(fileType) {
  currentFile = fileType;
  htmlMode = 'preview';
  renderCurrent();
}

function toggleHtmlMode() {
  if (currentFile !== 'html') return;
  htmlMode = (htmlMode === 'preview') ? 'code' : 'preview';
  renderCurrent();
}

function init() {
  loadLocalHistory();
  setupInfiniteScroll();
  setupTouchBack();
  connectWs();
  fetchHistoryPage(0, PAGE_SIZE, false);
  
  // Hide action buttons that aren't implemented yet
  const actionRefresh = document.getElementById('action-refresh');
  const actionCopy = document.getElementById('action-copy');
  const actionFlip = document.getElementById('action-flip');
  
  if (actionRefresh) actionRefresh.addEventListener('click', () => renderCurrent());
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
