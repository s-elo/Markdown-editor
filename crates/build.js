#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Cross-platform build script for Markdown-Editor
 * Works on Windows, macOS, and Linux
 * Usage: node build.js [platform] [options]
 *   platform: macos, windows, or all (default: current platform)
 *   options: --intel, --arm, --universal (for macOS), --gnu, --msvc (for Windows)
 *           --skip-client  Skip building the client (use pre-built client assets)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.dirname(SCRIPT_DIR);
const CRATES_DIR = SCRIPT_DIR;
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const CLIENT_DIST_DIR = path.join(PROJECT_ROOT, 'dist-local');
const BINARY_NAME = 'mds';

// Parse arguments
const args = process.argv.slice(2);
const platform = args.find((arg) => ['macos', 'windows', 'all'].includes(arg)) || getCurrentPlatform();
const options = args.filter((arg) => arg.startsWith('--'));
const skipClient = options.includes('--skip-client');

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

/**
 * Build the client for local bundling (same-origin serving).
 * Uses SERVER_PORT= (empty) so the client uses relative API URLs.
 * Outputs to dist-local/ to avoid conflicting with GitHub Pages dist/.
 */
function buildClient() {
  if (skipClient) {
    if (!fs.existsSync(CLIENT_DIST_DIR)) {
      console.error('ERROR: --skip-client specified but no pre-built client found at', CLIENT_DIST_DIR);
      process.exit(1);
    }
    console.log('Skipping client build, using pre-built assets from', CLIENT_DIST_DIR);
    return;
  }

  console.log('\nBuilding client for local bundle...');

  // Clean previous local build
  if (fs.existsSync(CLIENT_DIST_DIR)) {
    fs.rmSync(CLIENT_DIST_DIR, { recursive: true, force: true });
  }

  const env = {
    ...process.env,
    SERVER_PORT: '',
    CLIENT_DIST_PATH: CLIENT_DIST_DIR,
  };

  try {
    console.log('> pnpm --filter client build');
    execSync('pnpm --filter client build', {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      env,
    });
  } catch (error) {
    console.error('ERROR: Client build failed:', error.message);
    process.exit(1);
  }

  if (!fs.existsSync(path.join(CLIENT_DIST_DIR, 'index.html'))) {
    console.error('ERROR: Client build did not produce index.html in', CLIENT_DIST_DIR);
    process.exit(1);
  }

  console.log('✓ Client built to', CLIENT_DIST_DIR);
}

/**
 * Copy client assets from dist-local/ to a destination directory.
 */
function copyClientAssets(destDir) {
  console.log(`Copying client assets to ${destDir}...`);

  if (!fs.existsSync(CLIENT_DIST_DIR)) {
    console.warn('Warning: No client build found at', CLIENT_DIST_DIR, '- skipping client bundling');
    return;
  }

  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });
  copyDirSync(CLIENT_DIST_DIR, destDir);
}

function copyDirSync(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Check if Windows icon exists, warn if not found.
 */
function checkWindowsIcon() {
  const icoPath = path.join(CRATES_DIR, 'cli', 'assets', 'icon.ico');
  if (!fs.existsSync(icoPath)) {
    console.warn('Warning: icon.ico not found at', icoPath);
    console.warn('Run: node generate-icons.js --windows to generate it.');
  } else {
    console.log('Using pre-generated icon.ico');
  }
}

function buildWindows(useGnu = true) {
  const version = getVersion();
  console.log(`\nBuilding Markdown-Editor v${version} for Windows...\n`);

  buildClient();
  checkWindowsIcon();

  if (useGnu) {
    if (!checkRustTarget('x86_64-pc-windows-gnu', 'rustup target add x86_64-pc-windows-gnu')) {
      process.exit(1);
    }

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
    packageWindows(exePath, version);
  } else {
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
    packageWindows(exePath, version);
  }
}

function packageWindows(exePath, version) {
  if (!fs.existsSync(exePath)) {
    console.error(`ERROR: Binary not found at ${exePath}`);
    process.exit(1);
  }

  console.log('Packaging Windows distribution...');
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Create a staging directory for the zip contents
  const stagingDir = path.join(DIST_DIR, 'markdown-editor-windows-staging');
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  // Copy binary
  fs.copyFileSync(exePath, path.join(stagingDir, 'Markdown-Editor.exe'));

  // Copy client assets
  copyClientAssets(path.join(stagingDir, 'client'));

  // Create zip archive
  const zipPath = path.join(DIST_DIR, 'markdown-editor-windows.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  console.log('Creating zip archive...');
  try {
    if (os.platform() === 'win32') {
      exec(`powershell Compress-Archive -Path "${stagingDir}\\*" -DestinationPath "${zipPath}" -Force`);
    } else {
      exec(`cd "${stagingDir}" && zip -r "${zipPath}" .`);
    }
  } catch (error) {
    console.warn('Warning: Could not create zip archive.');
  }

  // Clean up staging
  fs.rmSync(stagingDir, { recursive: true, force: true });

  console.log('\n✓ Build complete!');
  console.log(`  Version:    ${version}`);
  console.log(`  Zip file:   ${zipPath}`);
}

function buildMacOS(buildType = 'universal') {
  const version = getVersion();
  console.log(`\nBuilding Markdown-Editor v${version} for macOS...\n`);

  buildClient();

  if (os.platform() !== 'darwin') {
    console.warn('WARNING: Building macOS binaries from non-macOS requires special setup.');
    console.warn('Consider using GitHub Actions with macOS runners for reliable builds.');
    console.warn('Continuing anyway...\n');
  }

  let binaryPath;
  const appName = 'Markdown-Editor';

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

  createMacOSAppBundle(binaryPath, appName, version);
}

/**
 * Copy pre-generated macOS icon to app bundle resources.
 */
function copyMacOSIcon(resourcesPath) {
  const sourceIcnsPath = path.join(CRATES_DIR, 'cli', 'assets', 'AppIcon.icns');
  const destIcnsPath = path.join(resourcesPath, 'AppIcon.icns');

  if (!fs.existsSync(sourceIcnsPath)) {
    console.warn('Warning: AppIcon.icns not found at', sourceIcnsPath);
    console.warn('Run: node generate-icons.js --macos to generate it.');
    return;
  }

  fs.copyFileSync(sourceIcnsPath, destIcnsPath);
  console.log('Using pre-generated AppIcon.icns');
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

  // Copy pre-generated app icon
  copyMacOSIcon(resourcesPath);

  // Copy client assets into Resources/client/
  copyClientAssets(path.join(resourcesPath, 'client'));

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
    <string>Markdown Editor</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
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

  // Code sign the app bundle (ad-hoc signing helps with Gatekeeper)
  if (os.platform() === 'darwin') {
    console.log('Code signing app bundle...');
    try {
      exec(`codesign --force --deep --sign - "${path.join(macosPath, BINARY_NAME)}"`);
      exec(`codesign --force --deep --sign - "${appPath}"`);

      try {
        execSync(`codesign --verify --verbose "${appPath}"`, { stdio: 'pipe' });
        console.log('✓ App bundle signed and verified successfully');
      } catch (verifyError) {
        console.warn('Warning: Code signing verification failed, but signing may have succeeded.');
      }
    } catch (error) {
      console.warn('Warning: Code signing failed. The app may be blocked by Gatekeeper.');
      console.warn(`Users may need to remove quarantine attribute: xattr -d com.apple.quarantine ${appName}.app`);
      console.warn('Or right-click the app and select "Open" instead of double-clicking.');
    }
  }

  // Create zip archive
  console.log('Creating zip archive...');
  const zipPath = path.join(DIST_DIR, 'markdown-editor-macos.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  try {
    if (os.platform() === 'win32') {
      exec(`powershell Compress-Archive -Path "${appPath}" -DestinationPath "${zipPath}" -Force`);
    } else {
      exec(`cd "${DIST_DIR}" && zip -r "markdown-editor-macos.zip" "${appName}.app"`);
    }
  } catch (error) {
    console.warn('Warning: Could not create zip archive. Install zip utility.');
  }

  console.log('\n✓ Build complete!');
  console.log(`  Version:    ${version}`);
  console.log(`  App bundle: ${appPath}`);
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
