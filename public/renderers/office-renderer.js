/**
 * Office File Renderer
 * Handles rendering of office documents (docx, xlsx, pptx, etc.)
 */

const officeRenderer = {
  canRender(contentType) {
    return contentType === 'office' || /^office\//i.test(contentType);
  },

  render(block, container) {
    if (!container) return;

    const filename = block.filename || 'untitled';
    const lang = block.lang || 'office';
    const timestamp = new Date(block.timestamp).toLocaleString('zh-CN', { hour12: false });

    // Get file extension
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    const iconMap = {
      '.doc': 'fa-file-word text-blue-500',
      '.docx': 'fa-file-word text-blue-500',
      '.xls': 'fa-file-excel text-green-500',
      '.xlsx': 'fa-file-excel text-green-500',
      '.ppt': 'fa-file-powerpoint text-red-500',
      '.pptx': 'fa-file-powerpoint text-red-500',
      '.odt': 'fa-file-word text-orange-500',
      '.ods': 'fa-file-excel text-green-600',
      '.odp': 'fa-file-powerpoint text-red-600',
    };

    const icon = iconMap[ext] || 'fa-file text-gray-400';

    container.innerHTML = `
      <div class="w-full max-w-2xl">
        <div class="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
          <span class="text-sm font-semibold text-gray-300">办公文件预览</span>
          <span class="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full font-mono">
            ${this.escapeHtml(lang.toUpperCase())}
          </span>
        </div>

        <div class="space-y-4">
          <!-- File Info Card -->
          <div class="bg-gradient-to-r from-gray-900/50 to-gray-800/30 border border-gray-800/50 rounded-xl p-6 hover:border-gray-700/50 transition-colors">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-lg bg-gray-800/60 flex items-center justify-center flex-shrink-0">
                <i class="fa-solid ${icon} text-xl"></i>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-bold text-white truncate">${this.escapeHtml(filename)}</h3>
                <div class="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span class="text-gray-500">文件类型</span>
                    <div class="text-emerald-400 font-semibold mt-1">${this.escapeHtml(ext.substring(1).toUpperCase())}</div>
                  </div>
                  <div>
                    <span class="text-gray-500">修改时间</span>
                    <div class="text-emerald-400 font-semibold mt-1">${timestamp}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Document Stats -->
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-black/40 border border-gray-800/60 rounded-lg p-4 text-center">
              <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-2">文件大小</div>
              <div class="text-sm font-bold text-cyan-400">${this.formatFileSize(block.code?.length || 0)}</div>
            </div>
            <div class="bg-black/40 border border-gray-800/60 rounded-lg p-4 text-center">
              <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-2">编码类型</div>
              <div class="text-sm font-bold text-purple-400">Binary</div>
            </div>
            <div class="bg-black/40 border border-gray-800/60 rounded-lg p-4 text-center">
              <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-2">状态</div>
              <div class="text-sm font-bold text-emerald-400">Ready</div>
            </div>
          </div>

          <!-- Info Message -->
          <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <i class="fa-solid fa-info-circle text-blue-400 mt-0.5 flex-shrink-0"></i>
              <div class="text-xs text-blue-200">
                <p class="font-semibold mb-1">Office 文件预览</p>
                <p>完整的办公文件内容预览功能正在开发中。当前版本显示文件信息概览。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }
};

// Register office renderer in dispatcher
if (typeof rendererDispatcher !== 'undefined') {
  rendererDispatcher.renderers.push(officeRenderer);
}
