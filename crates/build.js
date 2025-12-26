#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Cross-platform build script for MDS-Server
 * Works on Windows, macOS, and Linux
 * Usage: node build.js [platform] [options]
 *   platform: macos, windows, or all (default: current platform)
 *   options: --intel, --arm, --universal (for macOS), --gnu, --msvc (for Windows)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.dirname(SCRIPT_DIR);
const CRATES_DIR = SCRIPT_DIR;
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const BINARY_NAME = 'mds';

// Parse arguments
const args = process.argv.slice(2);
const platform = args.find((arg) => ['macos', 'windows', 'all'].includes(arg)) || getCurrentPlatform();
const options = args.filter((arg) => arg.startsWith('--'));

// Get version from package.json
function getVersion() {
  try {
    const pkgPath = path.join(PROJECT_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function getCurrentPlatform() {
  const platform = os.platform();
  if (platform === 'darwin') return 'macos';
  if (platform === 'win32') return 'windows';
  return 'linux';
}

function exec(command, options = {}) {
  try {
    console.log(`> ${command}`);
    execSync(command, {
      stdio: 'inherit',
      cwd: CRATES_DIR,
      ...options,
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function checkCommand(command, errorMsg) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    console.error(errorMsg);
    return false;
  }
}

function checkRustTarget(target, installCmd) {
  try {
    const installed = execSync('rustup target list --installed', { encoding: 'utf8' });
    if (installed.includes(target)) {
      return true;
    }
    console.error(`ERROR: Rust target ${target} not installed.`);
    console.error(`Run: ${installCmd}`);
    return false;
  } catch {
    console.error('ERROR: rustup not found. Please install Rust.');
    return false;
  }
}

function buildWindows(useGnu = true) {
  const version = getVersion();
  console.log(`\nBuilding MDS-Server v${version} for Windows...\n`);

  if (useGnu) {
    // Check dependencies
    if (!checkRustTarget('x86_64-pc-windows-gnu', 'rustup target add x86_64-pc-windows-gnu')) {
      process.exit(1);
    }

    // Check for MinGW (on Unix systems)
    if (os.platform() !== 'win32') {
      if (
        !checkCommand(
          'x86_64-w64-mingw32-gcc',
          'ERROR: MinGW-w64 not found.\nInstall with: brew install mingw-w64 (macOS) or apt-get install mingw-w64 (Linux)',
        )
      ) {
        process.exit(1);
      }
    }

    console.log('Building release binary for Windows (GNU toolchain)...');
    exec('cargo build --release --workspace --target x86_64-pc-windows-gnu');

    const exePath = path.join(CRATES_DIR, 'target', 'x86_64-pc-windows-gnu', 'release', 'mds.exe');
    copyToDist(exePath, 'mds.exe', 'mds-windows.zip');
  } else {
    // MSVC (only works on Windows natively)
    if (os.platform() !== 'win32') {
      console.error('ERROR: MSVC toolchain requires Windows OS.');
      console.error('Use --gnu for cross-compilation from macOS/Linux.');
      process.exit(1);
    }

    if (!checkRustTarget('x86_64-pc-windows-msvc', 'rustup target add x86_64-pc-windows-msvc')) {
      process.exit(1);
    }

    console.log('Building release binary for Windows (MSVC toolchain)...');
    exec('cargo build --release --workspace --target x86_64-pc-windows-msvc');

    const exePath = path.join(CRATES_DIR, 'target', 'x86_64-pc-windows-msvc', 'release', 'mds.exe');
    copyToDist(exePath, 'mds.exe', 'mds-windows.zip');
  }
}

function buildMacOS(buildType = 'universal') {
  const version = getVersion();
  console.log(`\nBuilding MDS-Server v${version} for macOS...\n`);

  // Check if we can build macOS from non-macOS (requires osxcross or similar)
  if (os.platform() !== 'darwin') {
    console.warn('WARNING: Building macOS binaries from non-macOS requires special setup.');
    console.warn('Consider using GitHub Actions with macOS runners for reliable builds.');
    console.warn('Continuing anyway...\n');
  }

  let binaryPath;
  const appName = 'MDS-Server';
  // const distAppPath = path.join(DIST_DIR, `${appName}.app`);

  if (buildType === 'intel' || buildType === '--intel') {
    if (!checkRustTarget('x86_64-apple-darwin', 'rustup target add x86_64-apple-darwin')) {
      process.exit(1);
    }
    console.log('Building release binary for Intel (x86_64)...');
    exec('cargo build --release -p md-server --target x86_64-apple-darwin');
    binaryPath = path.join(CRATES_DIR, 'target', 'x86_64-apple-darwin', 'release', BINARY_NAME);
  } else if (buildType === 'arm' || buildType === '--arm') {
    if (!checkRustTarget('aarch64-apple-darwin', 'rustup target add aarch64-apple-darwin')) {
      process.exit(1);
    }
    console.log('Building release binary for Apple Silicon (aarch64)...');
    exec('cargo build --release -p md-server --target aarch64-apple-darwin');
    binaryPath = path.join(CRATES_DIR, 'target', 'aarch64-apple-darwin', 'release', BINARY_NAME);
  } else {
    // Universal binary
    if (!checkRustTarget('x86_64-apple-darwin', 'rustup target add x86_64-apple-darwin')) {
      process.exit(1);
    }
    if (!checkRustTarget('aarch64-apple-darwin', 'rustup target add aarch64-apple-darwin')) {
      process.exit(1);
    }

    console.log('Building universal binary (Intel + Apple Silicon)...');
    console.log('  → Building for x86_64-apple-darwin...');
    exec('cargo build --release -p md-server --target x86_64-apple-darwin');
    console.log('  → Building for aarch64-apple-darwin...');
    exec('cargo build --release -p md-server --target aarch64-apple-darwin');

    // Create universal binary with lipo (macOS only)
    if (os.platform() === 'darwin') {
      console.log('  → Creating universal binary with lipo...');
      const universalDir = path.join(CRATES_DIR, 'target', 'universal-apple-darwin', 'release');
      if (!fs.existsSync(universalDir)) {
        fs.mkdirSync(universalDir, { recursive: true });
      }
      const universalPath = path.join(universalDir, BINARY_NAME);
      const intelPath = path.join(CRATES_DIR, 'target', 'x86_64-apple-darwin', 'release', BINARY_NAME);
      const armPath = path.join(CRATES_DIR, 'target', 'aarch64-apple-darwin', 'release', BINARY_NAME);

      exec(`lipo -create -output "${universalPath}" "${intelPath}" "${armPath}"`);
      binaryPath = universalPath;
    } else {
      console.warn('WARNING: lipo not available. Using aarch64 binary only.');
      binaryPath = path.join(CRATES_DIR, 'target', 'aarch64-apple-darwin', 'release', BINARY_NAME);
    }
  }

  // Create macOS app bundle
  createMacOSAppBundle(binaryPath, appName, version);
}

function createMacOSAppBundle(binaryPath, appName, version) {
  console.log('Creating app bundle...');

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const appPath = path.join(DIST_DIR, `${appName}.app`);
  const contentsPath = path.join(appPath, 'Contents');
  const macosPath = path.join(contentsPath, 'MacOS');
  const resourcesPath = path.join(contentsPath, 'Resources');

  // Clean up previous build
  if (fs.existsSync(appPath)) {
    fs.rmSync(appPath, { recursive: true, force: true });
  }

  // Create directory structure
  fs.mkdirSync(macosPath, { recursive: true });
  fs.mkdirSync(resourcesPath, { recursive: true });

  // Copy binary
  fs.copyFileSync(binaryPath, path.join(macosPath, BINARY_NAME));
  fs.chmodSync(path.join(macosPath, BINARY_NAME), 0o755);

  // Create Info.plist
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>${BINARY_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>com.markdown-editor.mds</string>
    <key>CFBundleName</key>
    <string>${appName}</string>
    <key>CFBundleDisplayName</key>
    <string>Markdown Editor Server</string>
    <key>CFBundleVersion</key>
    <string>${version}</string>
    <key>CFBundleShortVersionString</key>
    <string>${version}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSUIElement</key>
    <true/>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>`;
  fs.writeFileSync(path.join(contentsPath, 'Info.plist'), infoPlist);

  // Create PkgInfo
  fs.writeFileSync(path.join(contentsPath, 'PkgInfo'), 'APPL????');

  // Create zip archive
  console.log('Creating zip archive...');
  const zipPath = path.join(DIST_DIR, 'mds-macos.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Use zip command (available on macOS/Linux, or 7z on Windows)
  try {
    if (os.platform() === 'win32') {
      exec(`powershell Compress-Archive -Path "${appPath}" -DestinationPath "${zipPath}" -Force`);
    } else {
      exec(`cd "${DIST_DIR}" && zip -r "mds-macos.zip" "${appName}.app"`);
    }
  } catch (error) {
    console.warn('Warning: Could not create zip archive. Install zip utility.');
  }

  console.log('\n✓ Build complete!');
  console.log(`  Version:    ${version}`);
  console.log(`  App bundle: ${appPath}`);
  console.log(`  Zip file:   ${zipPath}`);
}

function copyToDist(sourcePath, destName, zipName) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`ERROR: Binary not found at ${sourcePath}`);
    process.exit(1);
  }

  console.log('Creating dist directory...');
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const destPath = path.join(DIST_DIR, destName);

  // Clean up previous build
  if (fs.existsSync(destPath)) {
    fs.unlinkSync(destPath);
  }
  const zipPath = path.join(DIST_DIR, zipName);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Copy binary
  console.log('Copying binary to dist...');
  fs.copyFileSync(sourcePath, destPath);

  // Create zip archive
  console.log('Creating zip archive...');
  try {
    if (os.platform() === 'win32') {
      exec(`powershell Compress-Archive -Path "${destPath}" -DestinationPath "${zipPath}" -Force`);
    } else {
      exec(`cd "${DIST_DIR}" && zip -q "${zipName}" "${destName}"`);
    }
  } catch (error) {
    console.warn('Warning: Could not create zip archive.');
  }

  const version = getVersion();
  console.log('\n✓ Build complete!');
  console.log(`  Version:    ${version}`);
  console.log(`  Binary:     ${destPath}`);
  console.log(`  Zip file:   ${zipPath}`);
}

// Main execution
try {
  if (platform === 'all') {
    buildMacOS('universal');
    buildWindows(true);
  } else if (platform === 'macos') {
    const buildType = options.find((opt) => ['--intel', '--arm', '--universal'].includes(opt)) || 'universal';
    buildMacOS(buildType);
  } else if (platform === 'windows') {
    const useGnu = !options.includes('--msvc');
    buildWindows(useGnu);
  } else {
    console.error(`Unknown platform: ${platform}`);
    console.error('Usage: node build.js [macos|windows|all] [--intel|--arm|--universal|--gnu|--msvc]');
    process.exit(1);
  }
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
