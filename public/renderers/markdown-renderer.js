/**
 * Markdown Renderer
 * Parses and renders Markdown content with syntax highlighting
 */

class MarkdownRenderer {
  constructor() {
    this.container = null;
  }

  /**
   * Check if marked library is available
   */
  isAvailable() {
    return typeof window.marked !== 'undefined';
  }

  /**
   * Render Markdown content
   * @param {string} markdown - Markdown content
   * @param {HTMLElement} container - Target container
   */
  render(markdown, container) {
    this.container = container;

    if (!this.isAvailable()) {
      container.innerHTML = '<div class="render-error">Markdown library not loaded</div>';
      return;
    }

    try {
      // Configure marked options
      window.marked.setOptions({
        breaks: true,
        gfm: true,
        pedantic: false,
      });

      // Render markdown to HTML
      const html = window.marked.parse(markdown);

      // Sanitize and render
      container.innerHTML = this.sanitizeHtml(html);

      // Apply syntax highlighting to code blocks
      this.highlightCodeBlocks(container);

      // Add interactivity
      this.addLinkTargets(container);
    } catch (error) {
      container.innerHTML = `<div class="render-error">Markdown rendering error: ${escHtml(error.message)}</div>`;
    }
  }

  /**
   * Basic HTML sanitization
   * @param {string} html - HTML string
   * @returns {string} Sanitized HTML
   */
  sanitizeHtml(html) {
    // Create a temporary element to parse and clean HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove script tags and event handlers
    const scripts = temp.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    // Remove event handlers from all elements
    temp.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return temp.innerHTML;
  }

  /**
   * Apply syntax highlighting to code blocks
   * @param {HTMLElement} container - Container with rendered content
   */
  highlightCodeBlocks(container) {
    if (typeof hljs === 'undefined') return;

    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
      try {
        hljs.highlightElement(block);
      } catch (error) {
        console.warn('Syntax highlighting failed:', error);
      }
    });
  }

  /**
   * Make links open in new tabs
   * @param {HTMLElement} container - Container with rendered content
   */
  addLinkTargets(container) {
    const links = container.querySelectorAll('a');
    links.forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
  }

  /**
   * Create DOM structure for rendering
   * @returns {HTMLElement} Render container
   */
  createContainer() {
    const div = document.createElement('div');
    div.className = 'markdown-content';
    return div;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownRenderer;
}
