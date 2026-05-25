/**
 * JSON/AST Tree Renderer
 * Displays JSON and AST structures in an expandable tree view
 */

class JsonTreeRenderer {
  constructor() {
    this.container = null;
    this.expandedNodes = new Set();
  }

  /**
   * Render JSON/AST content
   * @param {string|object} content - JSON string or object
   * @param {HTMLElement} container - Target container
   */
  render(content, container) {
    this.container = container;
    this.expandedNodes.clear();

    try {
      // Parse if string
      let data;
      if (typeof content === 'string') {
        data = JSON.parse(content);
      } else {
        data = content;
      }

      // Clear container
      container.innerHTML = '';
      container.className = 'json-tree-view';

      // Build tree
      const tree = this.buildTree(data, 'root', 0);
      container.appendChild(tree);
    } catch (error) {
      container.innerHTML = `<div class="render-error">JSON parsing error: ${escHtml(error.message)}</div>`;
    }
  }

  /**
   * Build tree structure recursively
   * @param {*} data - Data to visualize
   * @param {string} key - Node key
   * @param {number} depth - Nesting depth
   * @returns {HTMLElement} Tree node element
   */
  buildTree(data, key, depth) {
    const div = document.createElement('div');
    div.className = 'tree-node';
    div.style.paddingLeft = (depth * 20) + 'px';

    const type = this.getType(data);
    const isExpandable = type === 'object' || type === 'array';
    const nodeId = `node-${Math.random().toString(36).slice(2, 9)}`;

    // Create node header
    const header = document.createElement('div');
    header.className = 'tree-node-header';

    if (isExpandable) {
      const toggle = document.createElement('span');
      toggle.className = 'tree-toggle expanded';
      toggle.textContent = '▼';
      toggle.style.cursor = 'pointer';
      toggle.style.marginRight = '4px';
      toggle.onclick = () => this.toggleNode(nodeId, toggle);
      header.appendChild(toggle);
    } else {
      const spacer = document.createElement('span');
      spacer.style.display = 'inline-block';
      spacer.style.width = '16px';
      header.appendChild(spacer);
    }

    // Add key (if not root)
    if (key !== 'root') {
      const keyEl = document.createElement('span');
      keyEl.className = 'tree-key';
      keyEl.textContent = key;
      header.appendChild(keyEl);
      header.appendChild(document.createTextNode(': '));
    }

    // Add type/value preview
    const preview = document.createElement('span');
    preview.className = 'tree-preview';
    preview.textContent = this.getPreview(data, type);
    header.appendChild(preview);

    div.appendChild(header);

    // Add children if expandable
    if (isExpandable) {
      const childrenContainer = document.createElement('div');
      childrenContainer.id = nodeId;
      childrenContainer.className = 'tree-children';

      const entries = type === 'array' 
        ? data.map((item, idx) => [idx.toString(), item])
        : Object.entries(data);

      entries.forEach(([childKey, childValue]) => {
        const childNode = this.buildTree(childValue, childKey, depth + 1);
        childrenContainer.appendChild(childNode);
      });

      div.appendChild(childrenContainer);
      this.expandedNodes.add(nodeId);
    }

    return div;
  }

  /**
   * Get data type
   * @param {*} data - Data to check
   * @returns {string} Type name
   */
  getType(data) {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    return typeof data;
  }

  /**
   * Get preview text for data
   * @param {*} data - Data to preview
   * @param {string} type - Data type
   * @returns {string} Preview text
   */
  getPreview(data, type) {
    switch (type) {
      case 'string':
        return `"${escHtml(data.slice(0, 50))}${data.length > 50 ? '...' : ''}"`;
      case 'number':
      case 'boolean':
        return String(data);
      case 'null':
        return 'null';
      case 'array':
        return `Array[${data.length}]`;
      case 'object':
        const keys = Object.keys(data).length;
        return `Object{${keys}}`;
      default:
        return String(type);
    }
  }

  /**
   * Toggle node expansion
   * @param {string} nodeId - Node ID
   * @param {HTMLElement} toggle - Toggle button element
   */
  toggleNode(nodeId, toggle) {
    const children = document.getElementById(nodeId);
    if (!children) return;

    const isExpanded = this.expandedNodes.has(nodeId);
    if (isExpanded) {
      children.style.display = 'none';
      toggle.textContent = '▶';
      this.expandedNodes.delete(nodeId);
    } else {
      children.style.display = 'block';
      toggle.textContent = '▼';
      this.expandedNodes.add(nodeId);
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JsonTreeRenderer;
}
