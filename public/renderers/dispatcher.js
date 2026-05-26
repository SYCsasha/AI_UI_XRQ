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
      video: new VideoRenderer(),
      audio: new AudioRenderer(),
      svg: new SvgRenderer(),
      model3d: new Model3DRenderer(),
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
      'svg': 'svg',
      'image': 'image',
      'img': 'image',
      'pdf': 'pdf',
      'video': 'video',
      'mp4': 'video',
      'webm': 'video',
      'mov': 'video',
      'avi': 'video',
      'audio': 'audio',
      'music': 'audio',
      'mp3': 'audio',
      'wav': 'audio',
      'ogg': 'audio',
      'aac': 'audio',
      'm4a': 'audio',
      'model': 'model3d',
      'model3d': 'model3d',
      'gltf': 'model3d',
      'glb': 'model3d',
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

    // Video format detection by filename
    if (/\.(mp4|webm|ogg|ogv|mov|avi|mkv|flv|m3u8)$/i.test(filename)) {
      return 'video';
    }

    // Audio format detection by filename
    if (/\.(mp3|wav|ogg|oga|webm|aac|flac|m4a|wma)$/i.test(filename)) {
      return 'audio';
    }

    // Image format detection by filename
    if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(filename)) {
      return 'image';
    }

    // 3D model format detection
    if (/\.(gltf|glb|obj|fbx|dae|3ds)$/i.test(filename)) {
      return 'model3d';
    }

    // HTML detection by content start
    const code = block.code || '';
    if (code.trim().startsWith('<svg') || filename.endsWith('.svg')) {
      return 'svg';
    }

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

      case 'svg':
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

      case 'video':
        renderer.render(block.code, container);
        break;

      case 'audio':
        renderer.render(block.code, container);
        break;

      case 'model3d':
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
      video: '视频',
      audio: '音频',
      svg: 'SVG动画',
      model3d: '3D模型',
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
