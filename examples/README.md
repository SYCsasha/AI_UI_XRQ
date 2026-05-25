# AI Enhanced UI Renderer - Feature Guide

## Overview

The AI Enhanced UI Renderer is a powerful tool for rendering and visualizing multiple content types in real-time through a web interface.

## Quick Start

### Installation

```bash
npm install
npm start
# Server starts at http://localhost:7788
```

### Push Content

```bash
# Push a file
ai-push script.py

# Push via stdin
echo "# Hello" | ai-push --type markdown --filename doc.md

# View help
ai-push --help
```

## Supported Content Types

### 1. Code

Syntax-highlighted source code for 100+ languages.

```python
def fibonacci(n):
    """Calculate Fibonacci number"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

### 2. Markdown

Full Markdown support with:
- **Bold** and *italic* text
- `Inline code`
- Lists (ordered and unordered)
- Code blocks with syntax highlighting
- Tables
- Links and images

### 3. JSON/AST

Visualize complex data structures:

```json
{
  "name": "Project",
  "version": "2.0.0",
  "features": ["markdown", "json", "html", "images"]
}
```

### 4. HTML/CSS/JS

Live preview with interactive features:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>Interactive Content</h1>
  <button onclick="alert('Hello!')">Click</button>
</body>
</html>
```

### 5. Images

Display with zoom controls:
- PNG, JPG, GIF, WebP, SVG, BMP
- Responsive sizing
- Download capability

### 6. PDF

View PDF documents with page navigation.

## CLI Examples

### Push different content types

```bash
# Code
ai-push script.py

# Markdown
ai-push --type markdown README.md

# JSON
ai-push --type json data.json

# HTML
ai-push --type html index.html

# Image
ai-push screenshot.png
```

### Advanced usage

```bash
# Stream mode
cat data.txt | ai-push --stream --type markdown

# Custom session
ai-push --session my-session file.py

# Specific server
ai-push --host 192.168.1.100 --port 8000 file.py

# Download HTML
curl https://example.com/page.html | ai-push --type html
```

## Features

### Content Detection

Automatically detects content type by:
1. `--type` flag (highest priority)
2. `--lang` parameter
3. File extension
4. Content inspection
5. Default: code

### Real-time Updates

- WebSocket-based real-time communication
- Live history updates
- Automatic reconnection
- Offline queue persistence

### Responsive Design

- Desktop and mobile support
- Swipe gesture navigation
- Adaptive layouts
- Touch-friendly buttons

### Performance

- Chunked upload for large files
- Compressed responses
- Efficient caching
- Minimal bandwidth usage

## API Reference

### POST /api/push

Push a code block:

```json
{
  "code": "print('hello')",
  "lang": "python",
  "filename": "script.py",
  "contentType": "code",
  "label": "Example",
  "session": "default"
}
```

### GET /api/history

Fetch code history with pagination:

```
GET /api/history?offset=0&limit=50
```

### GET /api/stats

Server statistics:

```json
{
  "clients": 5,
  "history": 42,
  "uptime": 3600,
  "maxHistory": 200
}
```

### POST /api/clear

Clear all history.

## Configuration

### Environment Variables

- `PORT`: Server port (default: 7788)
- `MAX_HISTORY`: Maximum history items (default: 200)
- `AI_RENDERER_TIMEOUT_MS`: CLI timeout (default: 10000)

### CLI Config

```bash
# Save config
ai-push --config --host 192.168.1.100 --port 8000

# View saved config
cat ~/.ai-renderer/config.json
```

## Troubleshooting

### Server won't start

```bash
# Check port
lsof -i :7788

# Use different port
PORT=8000 npm start
```

### Content not rendering

- Check content type detection: `ai-push --type markdown file.md`
- Verify libraries loaded: Check browser console
- Check file encoding: Should be UTF-8

### Image not showing

- Verify image format is supported
- Check CORS if loading from remote URL
- Try downloading locally first

## Performance Tips

1. **Large files**: Use chunked upload (automatic for > 1MB)
2. **Mobile**: Use image preview for large images instead of full resolution
3. **Complex JSON**: Collapse unnecessary branches
4. **HTML**: Optimize JavaScript in preview
5. **PDF**: Large PDFs may take time to render

## Browser Support

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- Mobile: iOS Safari 14+, Chrome Mobile

## Security

- Sandboxed HTML/JS preview
- No persistent data without encryption
- Local storage for history
- CORS restricted

## License

MIT

---

For more information, visit the [GitHub repository](https://github.com/SYCsasha/AI_UI_XRQ)
