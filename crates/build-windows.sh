#!/bin/bash
set -e

# Build script for creating Windows executable with bundled client
# Usage: ./crates/build-windows.sh [--gnu|--msvc] [--skip-client]
#   --gnu         Build using GNU toolchain (cross-compile from macOS/Linux, default)
#   --msvc        Build using MSVC toolchain (requires Windows or special setup)
#   --skip-client Skip building the client (use pre-built client assets)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CRATES_DIR="${PROJECT_ROOT}/crates"
DIST_DIR="${PROJECT_ROOT}/dist"
CLIENT_DIST_DIR="${PROJECT_ROOT}/dist-local"
BINARY_NAME="mds"
CARGO_EXE="${BINARY_NAME}.exe"
DIST_EXE="Markdown-Editor.exe"

# Parse arguments
BUILD_TYPE="gnu"
SKIP_CLIENT=false
for arg in "$@"; do
  case "$arg" in
    --gnu|--msvc) BUILD_TYPE="${arg#--}" ;;
    --skip-client) SKIP_CLIENT=true ;;
  esac
done

# Read version from project root package.json
VERSION=$(node -p "require('${PROJECT_ROOT}/package.json').version" 2>/dev/null || echo "1.0.0")

echo "Building Markdown-Editor v${VERSION} for Windows..."

# Step 1: Build client for local bundle
if [ "$SKIP_CLIENT" = false ]; then
  echo ""
  echo "Building client for local bundle..."
  rm -rf "$CLIENT_DIST_DIR"
  cd "$PROJECT_ROOT"
  SERVER_PORT= CLIENT_DIST_PATH="$CLIENT_DIST_DIR" pnpm --filter client build
  if [ ! -f "$CLIENT_DIST_DIR/index.html" ]; then
    echo "ERROR: Client build did not produce index.html"
    exit 1
  fi
  echo "✓ Client built to $CLIENT_DIST_DIR"
else
  if [ ! -d "$CLIENT_DIST_DIR" ]; then
    echo "ERROR: --skip-client specified but no pre-built client at $CLIENT_DIST_DIR"
    exit 1
  fi
  echo "Using pre-built client from $CLIENT_DIST_DIR"
fi

# Step 2: Generate Windows icon from logo SVG
ICON_SVG="${PROJECT_ROOT}/client/public/logo.svg"
ICO_PATH="${CRATES_DIR}/cli/assets/icon.ico"
if [ ! -f "$ICO_PATH" ] && [ -f "$ICON_SVG" ]; then
  echo "Generating Windows icon..."
  TEMP_DIR=$(mktemp -d)
  SOURCE_PNG="${TEMP_DIR}/icon_256.png"

  if command -v rsvg-convert >/dev/null 2>&1; then
    rsvg-convert -w 256 -h 256 "$ICON_SVG" -o "$SOURCE_PNG"
  else
    qlmanage -t -s 256 -o "$TEMP_DIR" "$ICON_SVG" 2>/dev/null
    mv "${TEMP_DIR}/logo.svg.png" "$SOURCE_PNG" 2>/dev/null || true
  fi

  if [ -f "$SOURCE_PNG" ]; then
    mkdir -p "$(dirname "$ICO_PATH")"
    node -e "
      const fs = require('fs');
      const png = fs.readFileSync('${SOURCE_PNG}');
      const hdr = Buffer.alloc(6);
      hdr.writeUInt16LE(0,0); hdr.writeUInt16LE(1,2); hdr.writeUInt16LE(1,4);
      const ent = Buffer.alloc(16);
      ent.writeUInt8(0,0); ent.writeUInt8(0,1); ent.writeUInt8(0,2); ent.writeUInt8(0,3);
      ent.writeUInt16LE(1,4); ent.writeUInt16LE(32,6);
      ent.writeUInt32LE(png.length,8); ent.writeUInt32LE(22,12);
      fs.writeFileSync('${ICO_PATH}', Buffer.concat([hdr, ent, png]));
    "
    echo "✓ Windows icon generated"
  else
    echo "Warning: Could not convert SVG to PNG for icon."
  fi
  rm -rf "$TEMP_DIR"
fi

# Step 3: Build server binary
cd "$CRATES_DIR"

echo "Checking dependencies..."

case "$BUILD_TYPE" in
  gnu)
    if ! rustup target list --installed | grep -q "x86_64-pc-windows-gnu"; then
      echo "ERROR: Windows GNU target not installed."
      echo "Run: rustup target add x86_64-pc-windows-gnu"
      exit 1
    fi
    
    if ! which x86_64-w64-mingw32-gcc >/dev/null 2>&1; then
      echo "ERROR: MinGW-w64 not found."
      echo "Install with: brew install mingw-w64"
      exit 1
    fi
    
    echo "✓ Dependencies found"
    echo "Building release binary for Windows (GNU toolchain)..."
    cargo build --release --workspace --target x86_64-pc-windows-gnu
    BINARY_PATH="target/x86_64-pc-windows-gnu/release/${CARGO_EXE}"
    ;;
  msvc)
    echo "Building release binary for Windows (MSVC toolchain)..."
    cargo build --release --workspace --target x86_64-pc-windows-msvc
    BINARY_PATH="target/x86_64-pc-windows-msvc/release/${CARGO_EXE}"
    ;;
  *)
    echo "Unknown build type: $BUILD_TYPE"
    echo "Use --gnu (default) or --msvc"
    exit 1
    ;;
esac

if [ ! -f "$BINARY_PATH" ]; then
  echo "ERROR: Binary not found at $BINARY_PATH"
  exit 1
fi

# Step 4: Package binary + client into zip
echo "Packaging Windows distribution..."
mkdir -p "$DIST_DIR"

STAGING_DIR="${DIST_DIR}/markdown-editor-windows-staging"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# Copy binary (rename to Markdown-Editor.exe)
cp "$BINARY_PATH" "${STAGING_DIR}/${DIST_EXE}"

# Copy client assets
if [ -d "$CLIENT_DIST_DIR" ]; then
  echo "Bundling client assets..."
  cp -r "$CLIENT_DIST_DIR" "${STAGING_DIR}/client"
fi

# Create zip archive
rm -f "${DIST_DIR}/markdown-editor-windows.zip"
echo "Creating zip archive..."
cd "$STAGING_DIR"
zip -r "${DIST_DIR}/markdown-editor-windows.zip" .

# Clean up staging
rm -rf "$STAGING_DIR"

echo ""
echo "✓ Build complete!"
echo "  Version:    ${VERSION}"
echo "  Build type: ${BUILD_TYPE}"
echo "  Zip file:   ${DIST_DIR}/markdown-editor-windows.zip"
echo "  Client:     bundled in client/"
