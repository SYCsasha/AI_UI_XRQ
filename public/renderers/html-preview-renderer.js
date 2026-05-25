/**
 * HTML Preview Renderer
 * Renders HTML/CSS/JS in a sandboxed iframe for safe preview
 */

class HtmlPreviewRenderer {
  constructor() {
    this.container = null;
    this.iframe = null;
    this.updateTimeout = null;
  }

  /**
   * Render HTML content in iframe
   * @param {string} html - HTML content (can include CSS and JS)
   * @param {HTMLElement} container - Target container
   */
  render(html, container) {
    this.container = container;

    try {
      // Clear container
      container.innerHTML = '';
      container.className = 'html-preview-wrapper';

      // Create wrapper with controls
      const wrapper = document.createElement('div');
      wrapper.className = 'html-preview-controls';
      
      const btnGroup = document.createElement('div');
      btnGroup.className = 'preview-button-group';

      // Refresh button
      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'btn preview-btn';
      refreshBtn.textContent = '刷新预览';
      refreshBtn.onclick = () => this.updatePreview(html);
      btnGroup.appendChild(refreshBtn);

      // Open in new tab button
      const openBtn = document.createElement('button');
      openBtn.className = 'btn preview-btn';
      openBtn.textContent = '新窗口打开';
      openBtn.onclick = () => this.openInNewTab(html);
      btnGroup.appendChild(openBtn);

      // Download button
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'btn preview-btn';
      downloadBtn.textContent = '下载HTML';
      downloadBtn.onclick = () => this.downloadHtml(html);
      btnGroup.appendChild(downloadBtn);

      wrapper.appendChild(btnGroup);
      container.appendChild(wrapper);

      // Create iframe
      this.iframe = document.createElement('iframe');
      this.iframe.className = 'html-preview-iframe';
      this.iframe.sandbox.add('allow-scripts');
      this.iframe.sandbox.add('allow-same-origin');
      this.iframe.sandbox.add('allow-popups');
      this.iframe.sandbox.add('allow-forms');
      this.iframe.title = 'HTML Preview';
      
      container.appendChild(this.iframe);

      // Render content
      this.updatePreview(html);
    } catch (error) {
      container.innerHTML = `<div class="render-error">HTML preview error: ${escHtml(error.message)}</div>`;
    }
  }

  /**
   * Update iframe content
   * @param {string} html - HTML content
   */
  updatePreview(html) {
    if (!this.iframe) return;

    try {
      // Create a complete HTML document if not present
      let fullHtml = html;
      if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
        fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
      }

      // Inject error handler
      fullHtml = fullHtml.replace(
        '</body>',
        `<script>
window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('Runtime error:', msg, 'at', lineNo + ':' + columnNo);
};
</script>
</body>`
      );

      // Write to iframe
      this.iframe.contentDocument.open();
      this.iframe.contentDocument.write(fullHtml);
      this.iframe.contentDocument.close();

      // Auto-adjust height
      setTimeout(() => {
        try {
          const doc = this.iframe.contentDocument;
          if (doc && doc.body) {
            const height = doc.documentElement.scrollHeight;
            this.iframe.style.height = Math.max(300, height + 20) + 'px';
          }
        } catch (e) {
          // ignore cross-origin errors
        }
      }, 100);
    } catch (error) {
      console.error('Failed to update preview:', error);
    }
  }

  /**
   * Open HTML in new tab
   * @param {string} html - HTML content
   */
  openInNewTab(html) {
    const win = window.open();
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  /**
   * Download HTML file
   * @param {string} html - HTML content
   */
  downloadHtml(html) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `preview-${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HtmlPreviewRenderer;
}
