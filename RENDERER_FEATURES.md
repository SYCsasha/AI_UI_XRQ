# Enhanced UI Renderer - Rich Content Support

The AI Code Renderer now supports rendering multiple content types beyond plain code, including Markdown, JSON/AST, HTML/CSS/JS, images, and PDFs.

## Supported Content Types

### 1. **Code** (Default)
Traditional syntax-highlighted code display for any programming language.

```bash
# Push a Python file
ai-push script.py

# Push code with explicit language
echo "print('hello')" | ai-push --lang python
```

### 2. **Markdown**
Full Markdown rendering with syntax highlighting for embedded code blocks.

```bash
# Push a Markdown file
ai-push README.md

# Push Markdown content via stdin
echo "# Hello\nThis is **bold** text" | ai-push --type markdown --filename test.md
```

**Features:**
- Headers (h1-h3)
- Bold, italic, code formatting
- Lists (ordered and unordered)
- Code blocks with syntax highlighting
- Links (open in new tabs)
- Tables
- Blockquotes

### 3. **JSON/AST**
Visualize JSON structures and Abstract Syntax Trees in an expandable tree view.

```bash
# Push a JSON file
ai-push data.json

# Push JSON as AST
echo '{"name": "John", "age": 30}' | ai-push --type json --filename person.json
```

**Features:**
- Collapsible/expandable nodes
- Type indicators (Object, Array, String, Number, Boolean, null)
- Nested structure visualization

### 4. **HTML/CSS/JS Preview**
Real-time preview of HTML content in a sandboxed iframe with JavaScript execution.

```bash
# Push an HTML file
ai-push index.html

# Push HTML via stdin
echo '<h1>Hello World</h1><button onclick="alert(1)">Click</button>' | ai-push --type html

# Push HTML with styling
cat <<EOF | ai-push --type html --filename demo.html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>Dynamic Content</h1>
  <script>
    console.log('Page loaded');
  </script>
</body>
</html>
EOF
```

**Features:**
- Sandboxed iframe rendering
- CSS styling support
- JavaScript execution
- Refresh button to re-render
- "Open in new tab" for full-screen preview
- Download as HTML

**Safety:**
- Sandboxed execution prevents malicious scripts
- Event handlers are automatically sanitized
- Limited browser APIs

### 5. **Image Preview**
Display images with zoom and download capabilities.

```bash
# Push an image file
ai-push screenshot.png

# Image files are auto-detected by extension: .png, .jpg, .jpeg, .gif, .webp, .svg, .bmp
ai-push --type image --filename photo.jpg < image.jpg
```

**Features:**
- Zoom in/out controls
- Reset zoom
- Download original image
- Responsive display
- Image dimensions display

**Supported formats:** PNG, JPG, JPEG, GIF, WebP, SVG, BMP

### 6. **PDF Preview**
View PDF files with page navigation (requires pdf.js library).

```bash
# Push a PDF file
ai-push document.pdf

# Push PDF content
ai-push --type pdf --filename report.pdf < report.pdf
```

**Features:**
- Page navigation
- Zoom controls
- Fallback to external viewer if PDF.js unavailable

## Content Type Detection

Content types are automatically detected based on:
1. Explicit `--type` flag (highest priority)
2. File extension / language (`--lang`)
3. File extension
4. Content inspection (HTML, JSON)
5. Default: code

### Auto-Detection Examples

```bash
# Auto-detected as Markdown
echo "# Title" | ai-push --filename doc.md

# Auto-detected as JSON
echo '{"key": "value"}' | ai-push

# Auto-detected as HTML
echo '<div>content</div>' | ai-push

# Forced to code despite extension
echo "# Title" | ai-push --type code --filename doc.md
```

## CLI Usage

### Push with Content Type

```bash
# Explicit type specification
ai-push --type markdown --filename guide.md < guide.md

# Short form
ai-push -t markdown -f guide.md < guide.md

# Auto-detect from file extension
ai-push guide.md
```

### Supported Type Values

- `code` - Source code (default)
- `markdown` - Markdown document
- `json` - JSON/AST structure
- `html` - HTML/CSS/JS preview
- `image` - Image file
- `pdf` - PDF document

### Combined Options

```bash
# Stream Markdown with custom session
echo "# Live Markdown" | ai-push --type markdown --session my-session --stream

# Push large HTML file in chunks
ai-push --type html --filename large.html < large.html

# Push with metadata
ai-push --type markdown --filename doc.md --label "User Guide" < doc.md
```

## API Extensions

The HTTP API now supports `contentType` in payloads:

### POST /api/push

```json
{
  "code": "# Markdown",
  "lang": "markdown",
  "filename": "doc.md",
  "contentType": "markdown",
  "label": "Documentation",
  "session": "default"
}
```

### POST /api/push-chunk

Chunked uploads also support `contentType`:

```json
{
  "chunkId": "uuid",
  "index": 0,
  "total": 5,
  "chunkB64": "base64_chunk",
  "contentType": "html",
  "lang": "html",
  "filename": "large.html"
}
```

## Examples

### Example 1: Push and Preview Markdown Documentation

```bash
cat <<'EOF' | ai-push --type markdown --filename README.md --label "Project Guide"
# My Project

## Features
- Feature 1
- Feature 2

## Installation
```bash
npm install
```
EOF
```

### Example 2: Live HTML/CSS Preview

```bash
cat <<'EOF' > demo.html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    button {
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Interactive Demo</h1>
  <button onclick="alert('Button clicked!')">Click Me</button>
  <script>
    console.log('Demo loaded');
  </script>
</body>
</html>
EOF

ai-push demo.html
```

### Example 3: JSON/AST Visualization

```bash
cat <<'EOF' | ai-push --type json --filename ast.json
{
  "type": "Program",
  "body": [
    {
      "type": "VariableDeclaration",
      "declarations": [
        {
          "type": "VariableDeclarator",
          "id": { "type": "Identifier", "name": "x" },
          "init": { "type": "Literal", "value": 42 }
        }
      ]
    }
  ]
}
EOF
```

### Example 4: Image with Zoom

```bash
# Push a screenshot
ai-push --type image screenshot.png

# Or auto-detect by extension
ai-push screenshot.png
```

## Performance Considerations

- **Large files**: Use chunked upload for files > 1MB
- **Markdown**: Best for < 10MB of text
- **JSON trees**: Works well for structures up to thousands of nodes
- **HTML preview**: Sandbox provides isolation but heavy JavaScript may impact responsiveness
- **Images**: Auto-scales, works best with images < 50MB
- **PDFs**: Rendering may take time for large documents

## Browser Compatibility

- **Markdown**: All modern browsers
- **JSON tree**: All modern browsers
- **HTML preview**: Requires sandbox support (all modern browsers)
- **Images**: All modern browsers
- **PDF**: Requires PDF.js library (CDN included)

## Library Dependencies

The renderer uses these external libraries (loaded via CDN):

- **marked** - Markdown parsing
- **highlight.js** - Syntax highlighting
- **pdf.js** - PDF rendering (optional)

All libraries are loaded from CDN and work offline with minimal latency after initial load.

## Troubleshooting

### Markdown not rendering
- Check that the `marked` library is loaded (check browser console)
- Verify content type is correctly detected

### JSON tree not expanding
- Click on the toggle arrow (▼) to expand nodes
- Large trees may have performance issues if too deeply nested

### HTML preview blank
- Check browser console for errors
- Ensure HTML is valid
- JavaScript errors won't break the preview

### Image not showing
- Verify image URL is correct
- Check CORS if loading from different domain
- Supported formats: PNG, JPG, GIF, WebP, SVG, BMP

### PDF not rendering
- PDF.js may not be loaded - check console
- Try downloading PDF or opening in new tab

## Advanced Usage

### Batch Processing

```bash
# Push multiple files of different types
for file in *.md; do
  ai-push "$file" --type markdown
done

for file in *.json; do
  ai-push "$file" --type json
done
```

### Piping from Commands

```bash
# Push git diff as code
git diff | ai-push --lang diff --filename "changes.diff"

# Push system info as markdown
(echo "# System Info"; uname -a) | ai-push --type markdown

# Push JSON from API
curl https://api.example.com/data | ai-push --type json
```

### Integration with Tools

```bash
# From screenshot tool
gnome-screenshot -f /tmp/screenshot.png && ai-push /tmp/screenshot.png

# From code formatter
prettier index.js | ai-push --lang javascript --filename "formatted.js"

# From Markdown linter
markdownlint README.md 2>&1 | ai-push --type markdown
```
