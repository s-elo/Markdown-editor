#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Standalone script to generate macOS and Windows icons from SVG/PNG source.
 * Usage: node generate-icons.js [--macos] [--windows] [--all]
 *   --macos: Generate macOS icon only
 *   --windows: Generate Windows icon only
 *   --all: Generate both icons (default)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.dirname(SCRIPT_DIR);
const CRATES_DIR = SCRIPT_DIR;

// Parse arguments
const args = process.argv.slice(2);
const generateMacOS = args.includes('--macos') || args.includes('--all') || args.length === 0;
const generateWindows = args.includes('--windows') || args.includes('--all') || args.length === 0;

/**
 * Generate a .ico file for the Windows exe from logo.svg.
 * ICO format wraps a PNG image (supported since Windows Vista).
 */
function generateWindowsIcon() {
  const svgPath = path.join(PROJECT_ROOT, 'client', 'public', 'logo.svg');
  const icoDir = path.join(CRATES_DIR, 'cli', 'assets');
  const icoPath = path.join(icoDir, 'icon.ico');

  if (!fs.existsSync(svgPath)) {
    console.error('ERROR: logo.svg not found at', svgPath);
    process.exit(1);
  }

  console.log('Generating Windows icon...');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mds-icon-'));
  const pngPath = path.join(tmpDir, 'icon_256.png');

  try {
    try {
      execSync(`rsvg-convert -w 256 -h 256 "${svgPath}" -o "${pngPath}"`, { stdio: 'pipe' });
    } catch {
      if (os.platform() === 'darwin') {
        execSync(`qlmanage -t -s 256 -o "${tmpDir}" "${svgPath}"`, { stdio: 'pipe' });
        const qlOutput = path.join(tmpDir, 'logo.svg.png');
        if (fs.existsSync(qlOutput)) {
          fs.renameSync(qlOutput, pngPath);
        }
      } else {
        console.error('ERROR: Could not convert SVG to PNG. Install librsvg (brew install librsvg) or use macOS.');
        process.exit(1);
      }
    }

    if (!fs.existsSync(pngPath)) {
      console.error('ERROR: Could not convert SVG to PNG for Windows icon.');
      process.exit(1);
    }

    const pngData = fs.readFileSync(pngPath);

    // ICO = ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes) + PNG data
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);

    const entry = Buffer.alloc(16);
    entry.writeUInt8(0, 0); // width 256 → stored as 0
    entry.writeUInt8(0, 1); // height 256 → stored as 0
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(pngData.length, 8);
    entry.writeUInt32LE(22, 12); // offset = 6 + 16

    if (!fs.existsSync(icoDir)) {
      fs.mkdirSync(icoDir, { recursive: true });
    }
    fs.writeFileSync(icoPath, Buffer.concat([header, entry, pngData]));
    console.log('✓ Windows icon generated at', icoPath);
  } catch (err) {
    console.error('ERROR: Windows icon generation failed:', err.message);
    process.exit(1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function generateMacOSIcon(outputPath) {
  if (os.platform() !== 'darwin') {
    console.error('ERROR: macOS icon generation requires macOS (uses iconutil).');
    process.exit(1);
  }

  const svgPath = path.join(PROJECT_ROOT, 'client', 'public', 'logo.svg');
  if (!fs.existsSync(svgPath)) {
    console.error('ERROR: logo.svg not found at', svgPath);
    process.exit(1);
  }

  console.log('Generating macOS app icon...');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mds-icon-'));
  const iconsetDir = path.join(tmpDir, 'AppIcon.iconset');
  fs.mkdirSync(iconsetDir);

  const sourcePng = path.join(tmpDir, 'icon_1024.png');
  try {
    try {
      execSync(`rsvg-convert -w 1024 -h 1024 "${svgPath}" -o "${sourcePng}"`, { stdio: 'pipe' });
    } catch {
      execSync(`qlmanage -t -s 1024 -o "${tmpDir}" "${svgPath}"`, { stdio: 'pipe' });
      const qlOutput = path.join(tmpDir, 'logo.svg.png');
      if (fs.existsSync(qlOutput)) {
        fs.renameSync(qlOutput, sourcePng);
      }
    }

    if (!fs.existsSync(sourcePng)) {
      console.error('ERROR: Could not convert SVG to PNG. Install librsvg (brew install librsvg) for icon support.');
      process.exit(1);
    }

    const sizeMap = [
      [16, 'icon_16x16.png'],
      [32, 'icon_16x16@2x.png'],
      [32, 'icon_32x32.png'],
      [64, 'icon_32x32@2x.png'],
      [128, 'icon_128x128.png'],
      [256, 'icon_128x128@2x.png'],
      [256, 'icon_256x256.png'],
      [512, 'icon_256x256@2x.png'],
      [512, 'icon_512x512.png'],
      [1024, 'icon_512x512@2x.png'],
    ];

    for (const [size, name] of sizeMap) {
      execSync(`sips -z ${size} ${size} "${sourcePng}" --out "${path.join(iconsetDir, name)}"`, { stdio: 'pipe' });
    }

    const icnsPath = outputPath || path.join(CRATES_DIR, 'cli', 'assets', 'AppIcon.icns');
    const icnsDir = path.dirname(icnsPath);
    if (!fs.existsSync(icnsDir)) {
      fs.mkdirSync(icnsDir, { recursive: true });
    }
    execSync(`iconutil -c icns -o "${icnsPath}" "${iconsetDir}"`, { stdio: 'pipe' });
    console.log('✓ macOS icon generated at', icnsPath);
  } catch (err) {
    console.error('ERROR: Icon generation failed:', err.message);
    process.exit(1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Main execution
try {
  if (generateWindows) {
    generateWindowsIcon();
  }
  if (generateMacOS) {
    // Generate to a default location that can be copied during build
    generateMacOSIcon();
  }
  console.log('\n✓ Icon generation complete!');
} catch (error) {
  console.error('Icon generation failed:', error.message);
  process.exit(1);
}
