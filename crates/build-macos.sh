#!/bin/bash
set -e

# Build script for creating macOS .app bundle
# Usage: ./crates/build-macos.sh [--intel|--arm|--universal]
#   --intel     Build for Intel Macs only (x86_64)
#   --arm       Build for Apple Silicon only (aarch64)
#   --universal Build universal binary (default, works on both)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CRATES_DIR="${PROJECT_ROOT}/crates"
DIST_DIR="${PROJECT_ROOT}/dist"
APP_NAME="MDS-Server"
BINARY_NAME="mds"
BUNDLE_ID="com.markdown-editor.mds"

# Parse arguments
BUILD_TYPE="${1:-universal}"

# Read version from project root package.json
VERSION=$(node -p "require('${PROJECT_ROOT}/package.json').version" 2>/dev/null || echo "1.0.0")

echo "Building MDS-Server v${VERSION}..."

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
  
  # Set up OpenSSL environment for cross-compilation if needed
  if [ "$target" != "$HOST_TARGET" ]; then
    # Try to find OpenSSL via Homebrew for cross-compilation
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
  --intel)
    build_for_target "x86_64-apple-darwin" "Intel (x86_64)"
    BINARY_PATH="target/x86_64-apple-darwin/release/${BINARY_NAME}"
    ;;
  --arm)
    build_for_target "aarch64-apple-darwin" "Apple Silicon (aarch64)"
    BINARY_PATH="target/aarch64-apple-darwin/release/${BINARY_NAME}"
    ;;
  --universal|*)
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

echo "Creating app bundle..."

# Create dist directory
mkdir -p "$DIST_DIR"

# Clean up previous build
rm -rf "${DIST_DIR}/${APP_NAME}.app"
rm -f "${DIST_DIR}/mds-macos.zip"

# Create app bundle structure
mkdir -p "${DIST_DIR}/${APP_NAME}.app/Contents/MacOS"
mkdir -p "${DIST_DIR}/${APP_NAME}.app/Contents/Resources"

# Copy binary
cp "${BINARY_PATH}" "${DIST_DIR}/${APP_NAME}.app/Contents/MacOS/"

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
    <string>Markdown Editor Server</string>
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

echo "Creating zip archive..."
cd "$DIST_DIR"
zip -r "mds-macos.zip" "${APP_NAME}.app"

echo ""
echo "✓ Build complete!"
echo "  Version:    ${VERSION}"
echo "  Build type: ${BUILD_TYPE#--}"
echo "  App bundle: ${DIST_DIR}/${APP_NAME}.app"
echo "  Zip file:   ${DIST_DIR}/mds-macos.zip"
echo ""
echo "To test locally:"
echo "  open '${DIST_DIR}/${APP_NAME}.app'"
echo ""
echo "To distribute:"
echo "  Upload dist/mds-macos.zip to GitHub Pages or your download server"
echo ""
echo "Build options:"
echo "  ./crates/build-macos.sh --intel     # Intel Macs only"
echo "  ./crates/build-macos.sh --arm       # Apple Silicon only"
echo "  ./crates/build-macos.sh --universal # Both (default)"

