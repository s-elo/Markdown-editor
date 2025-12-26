#!/bin/bash
set -e

# Build script for creating Windows executable
# Usage: ./crates/build-windows.sh [--gnu|--msvc]
#   --gnu  Build using GNU toolchain (cross-compile from macOS/Linux, default)
#   --msvc Build using MSVC toolchain (requires Windows or special setup)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CRATES_DIR="${PROJECT_ROOT}/crates"
DIST_DIR="${PROJECT_ROOT}/dist"
BINARY_NAME="mds"
EXE_NAME="${BINARY_NAME}.exe"

# Parse arguments
BUILD_TYPE="${1:-gnu}"

# Read version from project root package.json
VERSION=$(node -p "require('${PROJECT_ROOT}/package.json').version" 2>/dev/null || echo "1.0.0")

echo "Building MDS-Server v${VERSION} for Windows..."

cd "$CRATES_DIR"

# Check dependencies before building
echo "Checking dependencies..."

# Check if building with GNU toolchain
if [ "$BUILD_TYPE" = "--gnu" ] || [ "$BUILD_TYPE" = "gnu" ]; then
  # Check if Windows GNU target is installed
  if ! rustup target list --installed | grep -q "x86_64-pc-windows-gnu"; then
    echo "ERROR: Windows GNU target not installed."
    echo "Run: rustup target add x86_64-pc-windows-gnu"
    exit 1
  fi
  
  # Check if MinGW-w64 compiler is available
  if ! which x86_64-w64-mingw32-gcc >/dev/null 2>&1; then
    echo "ERROR: MinGW-w64 not found."
    echo "Install with: brew install mingw-w64"
    echo "After installation, ensure it's in your PATH"
    exit 1
  fi
  
  echo "✓ Dependencies found"
fi

# Build based on selected type
case "$BUILD_TYPE" in
  --gnu|gnu)
    echo "Building release binary for Windows (GNU toolchain)..."
    cargo build --release --workspace --target x86_64-pc-windows-gnu
    BINARY_PATH="target/x86_64-pc-windows-gnu/release/${EXE_NAME}"
    ;;
  --msvc)
    echo "Building release binary for Windows (MSVC toolchain)..."
    cargo build --release --workspace --target x86_64-pc-windows-msvc
    BINARY_PATH="target/x86_64-pc-windows-msvc/release/${EXE_NAME}"
    ;;
  *)
    echo "Unknown build type: $BUILD_TYPE"
    echo "Use --gnu (default) or --msvc"
    exit 1
    ;;
esac

# Check if binary was created
if [ ! -f "$BINARY_PATH" ]; then
  echo "ERROR: Binary not found at $BINARY_PATH"
  exit 1
fi

echo "Creating dist directory..."
mkdir -p "$DIST_DIR"

# Clean up previous build
rm -f "${DIST_DIR}/${EXE_NAME}"
rm -f "${DIST_DIR}/mds-windows.zip"

# Copy binary to dist
echo "Copying binary to dist..."
cp "$BINARY_PATH" "${DIST_DIR}/${EXE_NAME}"

# Create zip archive
echo "Creating zip archive..."
cd "$DIST_DIR"
zip -q "mds-windows.zip" "${EXE_NAME}"

echo ""
echo "✓ Build complete!"
echo "  Version:    ${VERSION}"
echo "  Build type: ${BUILD_TYPE#--}"
echo "  Binary:     ${DIST_DIR}/${EXE_NAME}"
echo "  Zip file:   ${DIST_DIR}/mds-windows.zip"
echo ""
echo "Build options:"
echo "  ./crates/build-windows.sh --gnu  # GNU toolchain (default, cross-compile)"
echo "  ./crates/build-windows.sh --msvc # MSVC toolchain (requires Windows)"

