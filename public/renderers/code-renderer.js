/**
 * Code Renderer
 * Renders code with syntax highlighting
 */

class CodeRenderer {
  constructor() {
    this.container = null;
  }

  /**
   * Render code content
   * @param {string} code - Code content
   * @param {string} language - Programming language
   * @param {HTMLElement} container - Target container
   */
  render(code, language, container) {
    this.container = container;

    try {
      container.innerHTML = '';
      container.className = 'code-renderer';

      const pre = document.createElement('pre');
      const codeEl = document.createElement('code');

      // Set language class for highlighting
      if (language && language !== 'plaintext') {
        codeEl.className = `hljs language-${language}`;
      } else {
        codeEl.className = 'hljs';
      }

      // Set code content (escaped)
      codeEl.textContent = code;

      // Apply syntax highlighting if available
      if (typeof hljs !== 'undefined') {
        try {
          if (language && language !== 'plaintext') {
            hljs.highlightElement(codeEl);
          } else {
            hljs.highlightElement(codeEl);
          }
        } catch (error) {
          console.warn('Syntax highlighting failed:', error);
        }
      }

      pre.appendChild(codeEl);
      container.appendChild(pre);
    } catch (error) {
      container.innerHTML = `<div class="render-error">Code rendering error: ${escHtml(error.message)}</div>`;
    }
  }

  /**
   * Create container
   * @returns {HTMLElement} Render container
   */
  createContainer() {
    const div = document.createElement('div');
    div.className = 'code-container';
    return div;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CodeRenderer;
}
