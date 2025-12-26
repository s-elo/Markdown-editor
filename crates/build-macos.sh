#!/bin/bash
set -e

# Build script for creating macOS .app bundle
# Usage: ./crates/build-macos.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CRATES_DIR="${PROJECT_ROOT}/crates"
DIST_DIR="${PROJECT_ROOT}/dist"
APP_NAME="MDS-Server"
BINARY_NAME="mds"
BUNDLE_ID="com.markdown-editor.mds"

# Read version from project root package.json
VERSION=$(node -p "require('${PROJECT_ROOT}/package.json').version" 2>/dev/null || echo "1.0.0")

echo "Building MDS-Server v${VERSION}..."

cd "$CRATES_DIR"

echo "Building release binary..."
cargo build --release -p md-server

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
cp "target/release/${BINARY_NAME}" "${DIST_DIR}/${APP_NAME}.app/Contents/MacOS/"

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
echo "  App bundle: ${DIST_DIR}/${APP_NAME}.app"
echo "  Zip file:   ${DIST_DIR}/mds-macos.zip"
echo ""
echo "To test locally:"
echo "  open '${DIST_DIR}/${APP_NAME}.app'"
echo ""
echo "To distribute:"
echo "  Upload dist/mds-macos.zip to GitHub Pages or your download server"

