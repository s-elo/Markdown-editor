#!/bin/bash
set -e

# Build script for creating macOS .app bundle with bundled client
# Usage: ./crates/build-macos.sh [--intel|--arm|--universal] [--skip-client]
#   --intel       Build for Intel Macs only (x86_64)
#   --arm         Build for Apple Silicon only (aarch64)
#   --universal   Build universal binary (default, works on both)
#   --skip-client Skip building the client (use pre-built client assets)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CRATES_DIR="${PROJECT_ROOT}/crates"
DIST_DIR="${PROJECT_ROOT}/dist"
CLIENT_DIST_DIR="${PROJECT_ROOT}/dist-local"
APP_NAME="Markdown-Editor"
BINARY_NAME="mds"
BUNDLE_ID="com.markdown-editor.mds"

# Parse arguments
BUILD_TYPE="universal"
SKIP_CLIENT=false
for arg in "$@"; do
  case "$arg" in
    --intel|--arm|--universal) BUILD_TYPE="${arg#--}" ;;
    --skip-client) SKIP_CLIENT=true ;;
  esac
done

# Read version from project root package.json
VERSION=$(node -p "require('${PROJECT_ROOT}/package.json').version" 2>/dev/null || echo "1.0.0")

echo "Building Markdown-Editor v${VERSION}..."

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

# Step 2: Build server binary
cd "$CRATES_DIR"

# Detect host architecture
HOST_ARCH=$(uname -m)
if [ "$HOST_ARCH" = "arm64" ]; then
  HOST_TARGET="aarch64-apple-darwin"
else
  HOST_TARGET="x86_64-apple-darwin"
fi

# Function to build for a specific target
build_for_target() {
  local target=$1
  local target_name=$2
  
  echo "Building release binary for ${target_name}..."
  
  if [ "$target" != "$HOST_TARGET" ]; then
    if command -v brew >/dev/null 2>&1; then
      OPENSSL_DIR=$(brew --prefix openssl@3 2>/dev/null || brew --prefix openssl@1.1 2>/dev/null || echo "")
      if [ -n "$OPENSSL_DIR" ] && [ -d "$OPENSSL_DIR" ]; then
        export OPENSSL_DIR
        export OPENSSL_LIB_DIR="${OPENSSL_DIR}/lib"
        export OPENSSL_INCLUDE_DIR="${OPENSSL_DIR}/include"
        echo "  Using OpenSSL from: $OPENSSL_DIR"
      fi
    fi
  fi
  
  cargo build --release -p md-server --target "$target"
}

# Build based on selected type
case "$BUILD_TYPE" in
  intel)
    build_for_target "x86_64-apple-darwin" "Intel (x86_64)"
    BINARY_PATH="target/x86_64-apple-darwin/release/${BINARY_NAME}"
    ;;
  arm)
    build_for_target "aarch64-apple-darwin" "Apple Silicon (aarch64)"
    BINARY_PATH="target/aarch64-apple-darwin/release/${BINARY_NAME}"
    ;;
  universal|*)
    echo "Building universal binary (Intel + Apple Silicon)..."
    echo "  → Building for x86_64-apple-darwin..."
    build_for_target "x86_64-apple-darwin" "Intel (x86_64)"
    echo "  → Building for aarch64-apple-darwin..."
    build_for_target "aarch64-apple-darwin" "Apple Silicon (aarch64)"
    echo "  → Creating universal binary with lipo..."
    mkdir -p target/universal-apple-darwin/release
    lipo -create -output "target/universal-apple-darwin/release/${BINARY_NAME}" \
      "target/x86_64-apple-darwin/release/${BINARY_NAME}" \
      "target/aarch64-apple-darwin/release/${BINARY_NAME}"
    BINARY_PATH="target/universal-apple-darwin/release/${BINARY_NAME}"
    ;;
esac

# Step 3: Generate app icon from logo SVG
echo "Generating app icon..."
ICON_SVG="${PROJECT_ROOT}/client/public/logo.svg"
ICON_ICNS=""
if [ -f "$ICON_SVG" ]; then
  TEMP_DIR=$(mktemp -d)
  ICONSET_DIR="${TEMP_DIR}/AppIcon.iconset"
  mkdir -p "$ICONSET_DIR"

  SOURCE_PNG="${TEMP_DIR}/icon_1024.png"
  if command -v rsvg-convert >/dev/null 2>&1; then
    rsvg-convert -w 1024 -h 1024 "$ICON_SVG" -o "$SOURCE_PNG"
  else
    qlmanage -t -s 1024 -o "$TEMP_DIR" "$ICON_SVG" 2>/dev/null
    mv "${TEMP_DIR}/logo.svg.png" "$SOURCE_PNG" 2>/dev/null || true
  fi

  if [ -f "$SOURCE_PNG" ]; then
    sips -z 16 16 "$SOURCE_PNG" --out "${ICONSET_DIR}/icon_16x16.png" >/dev/null 2>&1
    sips -z 32 32 "$SOURCE_PNG" --out "${ICONSET_DIR}/icon_16x16@2x.png" >/dev/null 2>&1
    sips -z 32 32 "$SOURCE_PNG" --out "${ICONSET_DIR}/icon_32x32.png" >/dev/null 2>&1
    sips -z 64 64 "$SOURCE_PNG" --out "${ICONSET_DIR}/icon_32x32@2x.png" >/dev/null 2>&1
    sips -z 128 128 "$SOURCE_PNG" --out "${ICONSET_DIR}/icon_128x128.png" >/dev/null 2>&1
    sips -z 256 256 "$SOURCE_PNG" --out "${ICONSET_DIR}/icon_128x128@2x.png" >/dev/null 2>&1
    sips -z 256 256 "$SOURCE_PNG" --out "${ICONSET_DIR}/icon_256x256.png" >/dev/null 2>&1
    sips -z 512 512 "$SOURCE_PNG" --out "${ICONSET_DIR}/icon_256x256@2x.png" >/dev/null 2>&1
    sips -z 512 512 "$SOURCE_PNG" --out "${ICONSET_DIR}/icon_512x512.png" >/dev/null 2>&1
    sips -z 1024 1024 "$SOURCE_PNG" --out "${ICONSET_DIR}/icon_512x512@2x.png" >/dev/null 2>&1

    ICON_ICNS="${TEMP_DIR}/AppIcon.icns"
    iconutil -c icns -o "$ICON_ICNS" "$ICONSET_DIR"
    echo "✓ App icon generated"
  else
    echo "Warning: Could not convert SVG to PNG. Install librsvg (brew install librsvg) for icon support."
  fi
fi

# Step 4: Create app bundle
echo "Creating app bundle..."

mkdir -p "$DIST_DIR"

# Clean up previous build
rm -rf "${DIST_DIR}/${APP_NAME}.app"
rm -f "${DIST_DIR}/markdown-editor-macos.zip"

# Create app bundle structure
mkdir -p "${DIST_DIR}/${APP_NAME}.app/Contents/MacOS"
mkdir -p "${DIST_DIR}/${APP_NAME}.app/Contents/Resources"

# Copy binary
cp "${BINARY_PATH}" "${DIST_DIR}/${APP_NAME}.app/Contents/MacOS/"

# Copy app icon
if [ -n "$ICON_ICNS" ] && [ -f "$ICON_ICNS" ]; then
  cp "$ICON_ICNS" "${DIST_DIR}/${APP_NAME}.app/Contents/Resources/AppIcon.icns"
fi

# Copy client assets into Resources/client/
if [ -d "$CLIENT_DIST_DIR" ]; then
  echo "Bundling client assets..."
  cp -r "$CLIENT_DIST_DIR" "${DIST_DIR}/${APP_NAME}.app/Contents/Resources/client"
fi

# Create Info.plist
cat > "${DIST_DIR}/${APP_NAME}.app/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>${BINARY_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_ID}</string>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleDisplayName</key>
    <string>Markdown Editor</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSUIElement</key>
    <true/>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Create PkgInfo
echo -n "APPL????" > "${DIST_DIR}/${APP_NAME}.app/Contents/PkgInfo"

# Clean up icon temp files
if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
  rm -rf "$TEMP_DIR"
fi

echo "Creating zip archive..."
cd "$DIST_DIR"
zip -r "markdown-editor-macos.zip" "${APP_NAME}.app"

echo ""
echo "✓ Build complete!"
echo "  Version:    ${VERSION}"
echo "  Build type: ${BUILD_TYPE}"
echo "  App bundle: ${DIST_DIR}/${APP_NAME}.app"
echo "  Zip file:   ${DIST_DIR}/markdown-editor-macos.zip"
echo "  Client:     bundled in Resources/client/"
