# AI_UI_XRQ

**Enhanced AI Code Renderer with Rich Content Support**

## Features

### Core Capabilities
- 🔄 WebSocket-based real-time code pushing and rendering
- 📝 Code storage and history management
- 🎨 Syntax highlighting for 100+ languages
- 📱 Responsive mobile-friendly UI
- 🔄 Automatic reconnection and offline queue

### Rich Content Rendering (✨ NEW)
- **Markdown** - Full Markdown rendering with embedded code highlighting
- **JSON/AST** - Collapsible tree view for JSON structures and ASTs
- **HTML/CSS/JS** - Sandboxed preview with real-time rendering
- **Images** - Zoom controls and responsive display (PNG, JPG, GIF, WebP, SVG)
- **PDF** - PDF viewer with page navigation
- **Code** - Traditional code highlighting for any language

### Auto-Detection
Automatically detects content type by:
- File extension
- Language hint
- Content inspection (HTML, JSON detection)
- Explicit type specification

## Quick Start

### Server

```bash
npm install
npm start
# Web UI available at http://localhost:7788
```

### Push Code/Content

```bash
# Push a file
ai-push script.py

# Push code via stdin
echo "print('hello')" | ai-push --lang python

# Push Markdown
ai-push --type markdown README.md

# Push JSON/AST
echo '{"name": "John"}' | ai-push --type json

# Push HTML for preview
ai-push --type html index.html

# Push image
ai-push screenshot.png
```

## Configuration

```bash
# Configure server connection
ai-push --config --host 192.168.1.100 --port 8000

# View server stats
ai-push --status

# Clear all history
ai-push --clear
```

## Documentation

- [Full Feature Documentation](./RENDERER_FEATURES.md) - Detailed guide for all content types
- [CLI Usage](./cli/ai-push.js) - Comprehensive CLI reference

## Architecture

```
AI_UI_XRQ/
├── server/
│   └── server.js           # WebSocket server, history, API
├── cli/
│   └── ai-push.js          # CLI tool for pushing content
└── public/
    ├── index.html          # Web UI
    ├── client.js           # Client-side logic
    ├── style.css           # Styling
    └── renderers/          # Content-type specific renderers
        ├── code-renderer.js
        ├── markdown-renderer.js
        ├── json-tree-renderer.js
        ├── html-preview-renderer.js
        ├── image-renderer.js
        ├── pdf-renderer.js
        └── dispatcher.js    # Content type routing
```

## API

### POST /api/push
Push a single code block

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

### POST /api/push-chunk
Push large files in chunks

### GET /api/history?offset=0&limit=50
Fetch code history with pagination

### GET /api/stats
Server statistics

### POST /api/clear
Clear all history

## Environment Variables

- `PORT` - Server port (default: 7788)
- `MAX_HISTORY` - Maximum history items (default: 200)
- `AI_RENDERER_TIMEOUT_MS` - CLI timeout (default: 10000)

## License

MIT