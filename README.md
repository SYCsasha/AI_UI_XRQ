# LLM Result Showcase

**A modern web-based renderer for displaying AI/LLM results, code, and rich content in real-time.**

## Overview

LLM Result Showcase is a lightweight, WebSocket-based system that enables LLM applications to stream and visualize various types of content in a beautiful, responsive web interface. Perfect for showcasing model outputs, debugging AI workflows, and exploring generated code or data.

## ✨ Key Features

### Core Capabilities
- **Real-time Rendering** - WebSocket-based live content streaming
- **Multi-format Support** - Code, Markdown, JSON, HTML, images, PDF, video, audio, SVG, and 3D models
- **Responsive Design** - Mobile-friendly interface with touch support
- **Auto-detection** - Intelligently identifies content type by extension or inspection
- **Dark Editor** - Default dark mode for the code editor with syntax highlighting
- **Full-screen Preview** - Immersive viewing mode for rendered content
- **Refresh Controls** - Easy content refresh without reloading

### Supported Content Types
- **Code** - 100+ programming languages with syntax highlighting
- **Markdown** - Full markdown rendering with embedded code highlighting
- **JSON/AST** - Collapsible tree view for structured data
- **HTML/CSS/JS** - Sandboxed live preview rendering
- **Images** - Responsive display with zoom controls (PNG, JPG, GIF, WebP, SVG)
- **PDF** - Multi-page PDF viewer with navigation
- **Video** - MP4, WebM, MOV, AVI support
- **Audio** - MP3, WAV, OGG, AAC, FLAC, M4A support
- **SVG** - Vector graphics rendering
- **3D Models** - Interactive 3D visualization with enhanced rendering

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# Server runs on http://localhost:7788
```

### Command Line Usage

```bash
# Push a file from file path
ai-push /path/to/file.py

# Push markdown file
ai-push --type markdown README.md

# Push JSON data
ai-push data.json

# Push image
ai-push screenshot.png

# Clear all history
ai-push --clear

# View server status
ai-push --status
```

## 📖 Usage Guide

### Web Interface

1. **Render View** - Main content display area
   - Edit button - Switch to editor mode (opens with dark theme)
   - Refresh button - Refresh current content
   - Fullscreen button - Enter fullscreen view

2. **Code Editor** - Dark mode editing interface
   - Real-time rendering preview
   - Syntax highlighting for code
   - Sidebar with content history
   - Touch-friendly on mobile devices

### API Reference

#### POST /api/push
Push a single code block or content

```json
{
  "code": "print('hello world')",
  "lang": "python",
  "filename": "script.py",
  "contentType": "code",
  "label": "Example script",
  "session": "default"
}
```

#### POST /api/push-chunk
Push large files in chunks (automatic for files > 1MB)

#### GET /api/history?offset=0&limit=50
Fetch code history with pagination

#### GET /api/stats
Get server statistics

#### POST /api/clear
Clear all history

#### POST /api/delete-last
Delete the last transmitted result

## ⚙️ Configuration

### CLI Configuration

```bash
# Save default connection settings
ai-push --config --host 192.168.1.100 --port 8000 --session my-session
```

### Environment Variables

- `PORT` - Server listening port (default: 7788)
- `MAX_HISTORY` - Maximum history items to store (default: 200)
- `AI_RENDERER_TIMEOUT_MS` - CLI request timeout in milliseconds (default: 10000)

### File Structure

```
LLM-Result-Showcase/
├── server/
│   └── server.js           # WebSocket server and API
├── cli/
│   └── ai-push.js          # Command-line interface
└── public/
    ├── index.html          # Web UI
    ├── client.js           # Client-side logic
    ├── style.css           # Styling (dark mode for editor)
    └── renderers/          # Content renderers
        ├── code-renderer.js
        ├── markdown-renderer.js
        ├── json-tree-renderer.js
        ├── html-preview-renderer.js
        ├── image-renderer.js
        ├── pdf-renderer.js
        ├── video-renderer.js
        ├── audio-renderer.js
        ├── svg-renderer.js
        ├── model-3d-renderer.js
        ├── dispatcher.js
        └── utils.js
```

## 🎯 Use Cases

- **AI/LLM Output Showcase** - Display generated code, text, or content from language models
- **Code Review** - Browse and review multiple code snippets in history
- **Data Visualization** - Interactive JSON tree viewer for complex data structures
- **Media Previews** - Preview generated images, PDFs, or videos
- **Documentation** - Render markdown documentation in real-time
- **3D Model Viewer** - Interactive 3D model exploration

## 🔧 Development

### Adding a New Content Type

1. Create a new renderer file in `public/renderers/`:
```javascript
class MyCustomRenderer {
  render(code, container) {
    // Your rendering logic
  }
}
```

2. Register in `dispatcher.js`

3. Update CLI detection in `cli/ai-push.js`

## 📝 CLI Options

```
ai-push — Send code to LLM Result Showcase

Usage:
  ai-push [file]                     Push a file by path
  ai-push --type markdown README.md  Push markdown file
  ai-push --clear                    Clear all history

Options:
  --type,     -t  <type>     Content type (code, markdown, json, html, image, pdf, video, audio, svg, model3d)
  --label,    -L  <text>     Label/description for this block
  --session,  -s  <name>     Session name (default: 'default')
  --host,     -H  <host>     Server host (default: 127.0.0.1)
  --port,     -p  <port>     Server port (default: 7788)
  --clear                    Clear all code history in renderer
  --delete-last              Delete the last transmitted result
  --status                   Show server stats
  --config                   Save config (use with --host/--port/--session)
  --help                     Show this help
```

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or issues.

---

**Version**: 0.11.0

Made for showcasing AI/LLM results with style and clarity.