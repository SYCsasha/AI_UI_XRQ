#!/bin/bash
# AI Code Renderer - Install Script
# Run: bash install.sh

set -e

INSTALL_DIR="$HOME/.ai-renderer"
BIN_DIR="$HOME/.local/bin"

echo ""
echo "  ╔══════════════════════════════════╗"
echo "  ║   AI Code Renderer Installer     ║"
echo "  ╚══════════════════════════════════╝"
echo ""

# Check node
if ! command -v node &>/dev/null; then
  echo "  ✗ Node.js not found. Install from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 16 ]; then
  echo "  ✗ Node.js 16+ required (found $NODE_VER)"
  exit 1
fi

echo "  ✓ Node.js $(node --version)"

# Copy to install dir
mkdir -p "$INSTALL_DIR"
cp -r . "$INSTALL_DIR/"

# Install dependencies
cd "$INSTALL_DIR"
npm install --omit=dev --quiet

# Create bin symlinks
mkdir -p "$BIN_DIR"

cat > "$BIN_DIR/ai-renderer" << 'EOF'
#!/bin/bash
exec node "$HOME/.ai-renderer/server/server.js" "$@"
EOF
chmod +x "$BIN_DIR/ai-renderer"

cat > "$BIN_DIR/ai-push" << 'EOF'
#!/bin/bash
exec node "$HOME/.ai-renderer/cli/ai-push.js" "$@"
EOF
chmod +x "$BIN_DIR/ai-push"

# Add to PATH hint
echo ""
echo "  ✓ Installed to $INSTALL_DIR"
echo "  ✓ Commands: ai-renderer, ai-push"
echo ""

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo "  ⚠  Add to PATH: echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc && source ~/.bashrc"
  echo ""
fi

echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Usage:"
echo "    ai-renderer          # Start the server"
echo "    ai-push script.py    # Send a file"
echo "    ai-push --help       # Show CLI help"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
