/**
 * Renderer Utilities
 * Common utilities for all renderers
 */

/**
 * Escape HTML entities
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parse and validate JSON
 * @param {string} text - JSON text
 * @param {*} fallback - Fallback value if parse fails
 * @returns {*} Parsed JSON or fallback
 */
function parseJson(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncate(text, maxLength = 100) {
  const str = String(text);
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

/**
 * Detect if content is base64 encoded
 * @param {string} content - Content to check
 * @returns {boolean} True if appears to be base64
 */
function isBase64(content) {
  if (!content || typeof content !== 'string') return false;
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(content);
}

/**
 * Convert base64 to string
 * @param {string} base64 - Base64 string
 * @returns {string} Decoded string
 */
function fromBase64(base64) {
  try {
    return atob(base64);
  } catch {
    return null;
  }
}

/**
 * Convert string to base64
 * @param {string} text - Text to encode
 * @returns {string} Base64 encoded string
 */
function toBase64(text) {
  try {
    return btoa(text);
  } catch {
    return null;
  }
}

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} Extension without dot
 */
function getFileExtension(filename) {
  const match = String(filename).match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Get MIME type from file extension
 * @param {string} ext - File extension
 * @returns {string} MIME type
 */
function getMimeType(ext) {
  const mimeMap = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'pdf': 'application/pdf',
    'json': 'application/json',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'md': 'text/markdown',
    'txt': 'text/plain',
  };
  return mimeMap[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Debounce function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
  let timeoutId = null;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Minimum delay in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(fn, limit) {
  let inThrottle = false;
  return function throttled(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return null;
  }
}

/**
 * Merge objects
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} Merged object
 */
function merge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Create element helper
 * @param {string} tag - HTML tag
 * @param {object} attrs - Attributes
 * @param {Array|string} children - Child elements or text
 * @returns {HTMLElement} Element
 */
function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else {
      el.setAttribute(key, value);
    }
  }
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  });
  return el;
}

// Export all utilities
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escHtml,
    parseJson,
    truncate,
    isBase64,
    fromBase64,
    toBase64,
    getFileExtension,
    getMimeType,
    formatFileSize,
    formatDuration,
    debounce,
    throttle,
    deepClone,
    merge,
    createElement,
  };
}
