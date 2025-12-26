# Build Guide

This document explains how to build MDS-Server for different platforms.

## Cross-Platform Build Script

We provide a **cross-platform Node.js build script** (`build.js`) that works on Windows, macOS, and Linux:

```bash
# Build for current platform
node build.js

# Build for specific platform
node build.js macos
node build.js windows

# Build for all platforms (if on macOS)
node build.js all

# macOS options
node build.js macos --intel      # Intel only
node build.js macos --arm       # Apple Silicon only
node build.js macos --universal # Universal binary (default)

# Windows options
node build.js windows --gnu      # GNU toolchain (default, cross-compile)
node build.js windows --msvc     # MSVC toolchain (Windows only)
```

Or via pnpm:
```bash
pnpm build:macos
pnpm build:windows
pnpm build:all
```

## Platform-Specific Scripts

We also provide platform-specific shell scripts for Unix systems (macOS/Linux):

- `build-macos.sh` - Bash script for macOS builds
- `build-windows.sh` - Bash script for Windows cross-compilation

These work on macOS and Linux, but not on Windows (use `build.js` instead).

## Cross-Compilation Requirements

### Building Windows from macOS/Linux

**Requirements:**
1. Install Rust target: `rustup target add x86_64-pc-windows-gnu`
2. Install MinGW-w64:
   - **macOS**: `brew install mingw-w64`
   - **Linux**: `sudo apt-get install mingw-w64` (Debian/Ubuntu) or `sudo yum install mingw64-gcc` (RHEL/CentOS)

**Usage:**
```bash
node build.js windows
# or
./build-windows.sh
```

### Building macOS from Windows/Linux

**Note:** Building macOS binaries from non-macOS systems is **not recommended** and requires complex setup (osxcross). 

**Recommended approach:**
- Use GitHub Actions with macOS runners (see `.github/workflows/build.yml`)
- Or build natively on macOS

**If you must cross-compile:**
1. Install Rust targets: `rustup target add x86_64-apple-darwin aarch64-apple-darwin`
2. Set up osxcross (complex, see osxcross documentation)
3. Configure Cargo to use osxcross toolchain

### Building macOS from macOS

**Requirements:**
1. Install Rust targets:
   ```bash
   rustup target add x86_64-apple-darwin
   rustup target add aarch64-apple-darwin
   ```

**Usage:**
```bash
node build.js macos
# or
./build-macos.sh
```

## GitHub CI

The project includes a GitHub Actions workflow (`.github/workflows/build.yml`) that:

- Builds macOS binaries on macOS runners
- Builds Windows binaries on Windows runners  
- Builds Linux binaries and cross-compiles Windows on Linux runners

This is the **recommended way** to build for all platforms reliably.

## Output

All builds create artifacts in the `dist/` directory:

- **macOS**: `dist/MDS-Server.app` and `dist/mds-macos.zip`
- **Windows**: `dist/mds.exe` and `dist/mds-windows.zip`
- **Linux**: `target/release/mds` (binary only)

## Troubleshooting

### MinGW not found on macOS
```bash
brew install mingw-w64
export PATH="/opt/homebrew/bin:$PATH"  # Apple Silicon
# or
export PATH="/usr/local/bin:$PATH"     # Intel Mac
```

### Rust target not installed
```bash
rustup target add <target-name>
```

### Permission denied on scripts
```bash
chmod +x build-macos.sh build-windows.sh build.js
```

