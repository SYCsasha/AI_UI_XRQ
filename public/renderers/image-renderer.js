/**
 * Image Renderer
 * Displays images with zoom controls and metadata
 */

class ImageRenderer {
  constructor() {
    this.container = null;
    this.currentZoom = 100;
  }

  /**
   * Render image content
   * @param {string} imagePath - Image URL or base64 data
   * @param {HTMLElement} container - Target container
   * @param {object} metadata - Optional image metadata
   */
  render(imagePath, container, metadata = {}) {
    this.container = container;

    try {
      container.innerHTML = '';
      container.className = 'image-viewer-wrapper';

      // Create controls
      const controls = document.createElement('div');
      controls.className = 'image-controls';

      // Zoom out button
      const zoomOut = document.createElement('button');
      zoomOut.className = 'btn preview-btn';
      zoomOut.textContent = '缩小';
      zoomOut.onclick = () => this.zoomOut();
      controls.appendChild(zoomOut);

      // Zoom in button
      const zoomIn = document.createElement('button');
      zoomIn.className = 'btn preview-btn';
      zoomIn.textContent = '放大';
      zoomIn.onclick = () => this.zoomIn();
      controls.appendChild(zoomIn);

      // Reset button
      const reset = document.createElement('button');
      reset.className = 'btn preview-btn';
      reset.textContent = '重置';
      reset.onclick = () => this.resetZoom();
      controls.appendChild(reset);

      // Download button
      const download = document.createElement('button');
      download.className = 'btn preview-btn';
      download.textContent = '下载';
      download.onclick = () => this.downloadImage(imagePath);
      controls.appendChild(download);

      // Zoom level display
      const zoomDisplay = document.createElement('span');
      zoomDisplay.className = 'zoom-display';
      zoomDisplay.id = 'zoom-display';
      zoomDisplay.textContent = `${this.currentZoom}%`;
      controls.appendChild(zoomDisplay);

      container.appendChild(controls);

      // Create image container
      const imageContainer = document.createElement('div');
      imageContainer.className = 'image-container';

      // Create image element
      const img = document.createElement('img');
      img.className = 'image-element';
      img.src = imagePath;
      img.alt = metadata.filename || 'Image';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';

      // Handle image load
      img.onload = () => {
        if (metadata.filename) {
          const info = document.createElement('div');
          info.className = 'image-info';
          info.innerHTML = `
            <span>${escHtml(metadata.filename)}</span>
            <span>${img.naturalWidth}×${img.naturalHeight}px</span>
          `;
          imageContainer.appendChild(info);
        }
      };

      img.onerror = () => {
        imageContainer.innerHTML = '<div class="render-error">Failed to load image</div>';
      };

      imageContainer.appendChild(img);
      container.appendChild(imageContainer);
    } catch (error) {
      container.innerHTML = `<div class="render-error">Image rendering error: ${escHtml(error.message)}</div>`;
    }
  }

  /**
   * Zoom in
   */
  zoomIn() {
    this.currentZoom = Math.min(400, this.currentZoom + 25);
    this.updateZoom();
  }

  /**
   * Zoom out
   */
  zoomOut() {
    this.currentZoom = Math.max(25, this.currentZoom - 25);
    this.updateZoom();
  }

  /**
   * Reset zoom
   */
  resetZoom() {
    this.currentZoom = 100;
    this.updateZoom();
  }

  /**
   * Update zoom level
   */
  updateZoom() {
    const img = this.container?.querySelector('.image-element');
    if (img) {
      img.style.width = this.currentZoom + '%';
      img.style.height = 'auto';
    }
    const display = document.getElementById('zoom-display');
    if (display) {
      display.textContent = `${this.currentZoom}%`;
    }
  }

  /**
   * Download image
   * @param {string} imagePath - Image URL
   */
  downloadImage(imagePath) {
    const link = document.createElement('a');
    link.href = imagePath;
    link.download = `image-${Date.now()}.png`;
    link.click();
  }

  /**
   * Detect if content is image data
   * @param {string} content - Content string
   * @returns {boolean} True if appears to be image
   */
  static isImageData(content) {
    return content.startsWith('data:image/') || 
           /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(content);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageRenderer;
}
