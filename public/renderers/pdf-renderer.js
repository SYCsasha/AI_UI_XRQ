/**
 * PDF Renderer
 * Displays PDF files
 * Note: Requires pdf.js library for full functionality
 */

class PdfRenderer {
  constructor() {
    this.container = null;
  }

  /**
   * Check if PDF.js is available
   */
  isAvailable() {
    return typeof window.pdfjsLib !== 'undefined';
  }

  /**
   * Render PDF content
   * @param {string} pdfPath - Path to PDF file or base64 data
   * @param {HTMLElement} container - Target container
   */
  render(pdfPath, container) {
    this.container = container;

    try {
      container.innerHTML = '';
      container.className = 'pdf-viewer-wrapper';

      if (!this.isAvailable()) {
        // Fallback: embed using iframe
        this.renderWithIframe(pdfPath, container);
        return;
      }

      // Use PDF.js for rendering
      this.renderWithPdfJs(pdfPath, container);
    } catch (error) {
      container.innerHTML = `<div class="render-error">PDF rendering error: ${escHtml(error.message)}</div>`;
    }
  }

  /**
   * Render PDF using iframe (fallback)
   * @param {string} pdfPath - PDF path
   * @param {HTMLElement} container - Target container
   */
  renderWithIframe(pdfPath, container) {
    // Create download link since we can't render directly
    const div = document.createElement('div');
    div.className = 'pdf-fallback';
    div.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <p>PDF.js library not loaded. PDF preview requires external viewer.</p>
        <button class="btn" onclick="window.open('${pdfPath}', '_blank')">
          在新窗口打开 PDF
        </button>
      </div>
    `;
    container.appendChild(div);
  }

  /**
   * Render PDF using PDF.js
   * @param {string} pdfPath - PDF path
   * @param {HTMLElement} container - Target container
   */
  renderWithPdfJs(pdfPath, container) {
    const pdfjsLib = window.pdfjsLib;

    // Create controls
    const controls = document.createElement('div');
    controls.className = 'pdf-controls';

    const pageInput = document.createElement('input');
    pageInput.type = 'number';
    pageInput.min = '1';
    pageInput.value = '1';
    pageInput.className = 'pdf-page-input';
    controls.appendChild(pageInput);

    const totalPages = document.createElement('span');
    totalPages.className = 'pdf-total-pages';
    totalPages.textContent = 'of --';
    controls.appendChild(totalPages);

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn pdf-btn';
    prevBtn.textContent = '上一页';
    controls.appendChild(prevBtn);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn pdf-btn';
    nextBtn.textContent = '下一页';
    controls.appendChild(nextBtn);

    container.appendChild(controls);

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-canvas';
    container.appendChild(canvas);

    // Load PDF
    const loadingTask = pdfjsLib.getDocument(pdfPath);
    loadingTask.promise.then(pdf => {
      totalPages.textContent = `of ${pdf.numPages}`;

      const renderPage = (pageNum) => {
        if (pageNum < 1 || pageNum > pdf.numPages) return;
        pageInput.value = pageNum;

        pdf.getPage(pageNum).then(page => {
          const scale = 2;
          const viewport = page.getViewport({ scale });
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
          };
          page.render(renderContext).promise.then(() => {
            console.log(`Page ${pageNum} rendered`);
          });
        });
      };

      prevBtn.onclick = () => {
        const currentPage = Math.max(1, parseInt(pageInput.value) - 1);
        renderPage(currentPage);
      };

      nextBtn.onclick = () => {
        const currentPage = Math.min(pdf.numPages, parseInt(pageInput.value) + 1);
        renderPage(currentPage);
      };

      pageInput.onchange = () => {
        const pageNum = Math.max(1, Math.min(pdf.numPages, parseInt(pageInput.value)));
        renderPage(pageNum);
      };

      // Render first page
      renderPage(1);
    }).catch(error => {
      container.innerHTML = `<div class="render-error">Failed to load PDF: ${escHtml(error.message)}</div>`;
    });
  }

  /**
   * Detect if content is PDF
   * @param {string} content - Content string
   * @returns {boolean} True if appears to be PDF
   */
  static isPdfData(content) {
    return content.startsWith('data:application/pdf') || 
           content.startsWith('%PDF') ||
           /\.pdf$/i.test(content);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PdfRenderer;
}
