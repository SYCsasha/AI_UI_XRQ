const PAGE_SIZE = 50;
const SCROLL_THRESHOLD_PX = 80;
const FALLBACK_POLL_PAGE_SIZE = 10;
const LOCAL_HISTORY_KEY = 'ai_renderer_history_v1';
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

const app = document.getElementById('app');
const renderCodeEl = document.getElementById('render-code');
const renderFilenameEl = document.getElementById('render-filename');
const renderLangEl = document.getElementById('render-lang');
const sidebarListEl = document.getElementById('sidebar-list');
const editorEl = document.getElementById('editor');

function escHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function status(text, connected = false) {
  const dot = document.getElementById('status-dot');
  const label = document.getElementById('status-text');
  label.textContent = text;
  dot.classList.toggle('connected', connected);
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
      renderSidebar();
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

  saveLocalHistory();
  renderSidebar();
  renderCurrent();
}

function selectedBlock() {
  return blocks.find((item) => item.id === selectedId) || null;
}

function renderCurrent() {
  const block = selectedBlock();
  if (!block) {
    renderFilenameEl.textContent = '等待代码';
    renderLangEl.textContent = 'plaintext';
    renderCodeEl.textContent = '等待来自 CLI 的代码推送...';
    document.getElementById('editor-filename').textContent = '-';
    document.getElementById('editor-time').textContent = '-';
    document.getElementById('render-type').textContent = '代码';
    editorEl.value = '';
    return;
  }

  renderFilenameEl.textContent = block.filename || 'untitled';
  renderLangEl.textContent = block.lang || 'plaintext';
  document.getElementById('editor-filename').textContent = block.filename || 'untitled';
  document.getElementById('editor-time').textContent = new Date(block.timestamp).toLocaleString('zh-CN', { hour12: false });

  // Use renderer dispatcher for content rendering
  const renderContent = document.getElementById('render-content');
  const contentType = rendererDispatcher.detectContentType(block);
  document.getElementById('render-type').textContent = rendererDispatcher.getTypeName(contentType);
  
  rendererDispatcher.render(block, renderContent);
  
  editorEl.value = block.code || '';
}

function renderSidebar() {
  sidebarListEl.innerHTML = '';
  blocks.forEach((block) => {
    const item = document.createElement('div');
    item.className = `sidebar-item${block.id === selectedId ? ' active' : ''}`;
    item.innerHTML = `
      <div class="sidebar-item-name">${escHtml(block.filename || 'untitled')}</div>
      <div class="sidebar-item-meta">${escHtml(block.lang || 'plaintext')} · ${new Date(block.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}</div>
    `;
    item.addEventListener('click', () => {
      selectedId = block.id;
      renderSidebar();
      renderCurrent();
      document.getElementById('code-view').classList.remove('sidebar-open');
    });
    sidebarListEl.appendChild(item);
  });
}

function switchMode(mode) {
  app.classList.toggle('mode-render', mode === 'render');
  app.classList.toggle('mode-code', mode === 'code');
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
  const pane = document.querySelector('.sidebar');
  if (!pane) return;
  pane.addEventListener('scroll', () => {
    if (!hasMore || loadingPage) return;
    const nearBottom = pane.scrollTop + pane.clientHeight >= pane.scrollHeight - SCROLL_THRESHOLD_PX;
    if (nearBottom) {
      fetchHistoryPage(loadedOffset, PAGE_SIZE, true);
    }
  });
}

function setupButtons() {
  document.getElementById('edit-btn').addEventListener('click', () => switchMode('code'));
  document.getElementById('render-btn').addEventListener('click', () => switchMode('render'));

  document.getElementById('reset-btn').addEventListener('click', async () => {
    if (!window.confirm('确认删除所有代码历史？')) return;
    await fetch('/api/clear', { method: 'POST' });
    blocks = [];
    selectedId = null;
    loadedOffset = 0;
    hasMore = false;
    saveLocalHistory();
    renderSidebar();
    renderCurrent();
    switchMode('render');
  });

  document.getElementById('refresh-btn').addEventListener('click', () => {
    renderCurrent();
  });

  document.getElementById('fullscreen-btn').addEventListener('click', () => {
    const renderCard = document.getElementById('render-card');
    if (renderCard) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        renderCard.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    }
  });

  document.getElementById('toggle-sidebar').addEventListener('click', () => {
    document.getElementById('code-view').classList.toggle('sidebar-open');
  });
}

function setupEditorSync() {
  editorEl.addEventListener('input', () => {
    const block = selectedBlock();
    if (!block) return;
    block.code = editorEl.value;
    renderCurrent();
    saveLocalHistory();
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
  status('connecting', false);

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    reconnectAttempts = 0;
    status('live', true);
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
      renderSidebar();
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
        renderSidebar();
        renderCurrent();
      }
      return;
    }
  };

  ws.onclose = () => {
    status('disconnected', false);
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
    if (!app.classList.contains('mode-code')) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = Math.abs(touch.clientY - startY);
    if (dx > 80 && dy < 40) {
      switchMode('render');
    }
  }, { passive: true });
}

function init() {
  switchMode('render');
  loadLocalHistory();
  setupButtons();
  setupEditorSync();
  setupInfiniteScroll();
  setupTouchBack();
  connectWs();
  fetchHistoryPage(0, PAGE_SIZE, false);
}

init();
