/**
 * Renderer Dispatcher
 * Routes content to appropriate renderer based on type
 */

class RendererDispatcher {
  constructor() {
    this.renderers = {
      code: new CodeRenderer(),
      markdown: new MarkdownRenderer(),
      json: new JsonTreeRenderer(),
      html: new HtmlPreviewRenderer(),
      image: new ImageRenderer(),
      pdf: new PdfRenderer(),
    };
    this.currentRenderer = null;
  }

  /**
   * Detect content type
   * @param {object} block - Code block with lang, code, and optional metadata
   * @returns {string} Content type
   */
  detectContentType(block) {
    // Check explicit type hint
    if (block.meta?.contentType) {
      return block.meta.contentType;
    }

    const lang = block.lang?.toLowerCase() || '';
    const filename = block.filename?.toLowerCase() || '';

    // Language-based detection
    const typeMap = {
      'markdown': 'markdown',
      'md': 'markdown',
      'mdown': 'markdown',
      'json': 'json',
      'html': 'html',
      'xml': 'html',
      'svg': 'html',
      'image': 'image',
      'img': 'image',
      'pdf': 'pdf',
    };

    if (typeMap[lang]) {
      return typeMap[lang];
    }

    // Filename extension detection
    for (const [ext, type] of Object.entries(typeMap)) {
      if (filename.endsWith(`.${ext}`)) {
        return type;
      }
    }

    // Image format detection by filename
    if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(filename)) {
      return 'image';
    }

    // HTML detection by content start
    const code = block.code || '';
    if (code.trim().startsWith('<') || code.includes('<!DOCTYPE')) {
      return 'html';
    }

    // JSON detection by content start
    if (code.trim().startsWith('{') || code.trim().startsWith('[')) {
      try {
        JSON.parse(code);
        return 'json';
      } catch {
        // Not valid JSON, treat as code
      }
    }

    // Default to code
    return 'code';
  }

  /**
   * Render content based on type
   * @param {object} block - Code block
   * @param {HTMLElement} container - Target container
   */
  render(block, container) {
    const contentType = this.detectContentType(block);
    
    // Clear previous renderer if different type
    if (this.currentRenderer) {
      if (this.currentRenderer.destroy) {
        this.currentRenderer.destroy();
      }
    }

    const renderer = this.renderers[contentType];
    if (!renderer) {
      container.innerHTML = `<div class="render-error">Unknown content type: ${escHtml(contentType)}</div>`;
      return;
    }

    this.currentRenderer = renderer;

    // Route to appropriate renderer
    switch (contentType) {
      case 'markdown':
        renderer.render(block.code, container);
        break;

      case 'json':
        renderer.render(block.code, container);
        break;

      case 'html':
        renderer.render(block.code, container);
        break;

      case 'image':
        renderer.render(block.code, container, {
          filename: block.filename
        });
        break;

      case 'pdf':
        renderer.render(block.code, container);
        break;

      case 'code':
      default:
        renderer.render(block.code, block.lang, container);
        break;
    }
  }

  /**
   * Get content type display name
   * @param {string} type - Content type
   * @returns {string} Display name
   */
  getTypeName(type) {
    const names = {
      code: '代码',
      markdown: 'Markdown',
      json: 'JSON/AST',
      html: 'HTML预览',
      image: '图像',
      pdf: 'PDF',
    };
    return names[type] || '内容';
  }
}

// Create global instance
const rendererDispatcher = new RendererDispatcher();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RendererDispatcher;
}
