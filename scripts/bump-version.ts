#!/usr/bin/env node
/**
 * Version bump script for Markdown Editor
 * Updates versions in package.json files and Cargo.toml
 * Handles pre-release versions with branch management
 * Enforces main branch for formal releases
 *
 * Usage:
 *   pnpm release [patch|minor|major] [--alpha|--beta|--rc] [--dry-run|-d]
 *
 * Examples:
 *   pnpm release major --alpha    # 1.0.0 -> 2.0.0-alpha.1 (or 2.0.0-alpha.2 if tag exists)
 *   pnpm release minor --beta     # 1.0.0 -> 1.1.0-beta.1 (or 1.1.0-beta.2 if tag exists)
 *   pnpm release patch --rc       # 1.0.0 -> 1.0.1-rc.1 (or 1.0.1-rc.2 if tag exists)
 *   pnpm release patch             # 1.0.0 -> 1.0.1 (formal release)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

import * as semver from 'semver';

const PROJECT_ROOT = process.cwd();
const PACKAGE_JSON = path.join(PROJECT_ROOT, 'package.json');
const CRATES_CARGO_TOML = path.join(PROJECT_ROOT, 'crates', 'Cargo.toml');
const CRATES_PACKAGE_JSON = path.join(PROJECT_ROOT, 'crates', 'package.json');
const CLIENT_PACKAGE_JSON = path.join(PROJECT_ROOT, 'client', 'package.json');

type VersionBumpType = 'major' | 'minor' | 'patch';
type PreReleaseType = 'alpha' | 'beta' | 'rc';

interface ReleaseConfig {
  bumpType: VersionBumpType;
  preReleaseType: PreReleaseType | null;
}

// Parse command line arguments
const ARGV_OFFSET = 2;
const args = process.argv.slice(ARGV_OFFSET);
const isDryRun = args.includes('--dry-run') || args.includes('-d');

const VALID_BUMP_TYPES: VersionBumpType[] = ['major', 'minor', 'patch'];
const PRE_RELEASE_TYPES: PreReleaseType[] = ['alpha', 'beta', 'rc'];

// Parse arguments
function parseArguments(): ReleaseConfig {
  // Remove flags from args for parsing
  const positionalArgs = args.filter((arg) => !arg.startsWith('--') && arg !== '-d');

  // Check first positional argument - must be a version bump type
  if (positionalArgs.length === 0) {
    console.error('Usage: pnpm release [patch|minor|major] [--alpha|--beta|--rc] [--dry-run|-d]');
    process.exit(1);
  }

  const firstArg = positionalArgs[0];
  if (!VALID_BUMP_TYPES.includes(firstArg as VersionBumpType)) {
    console.error('Usage: pnpm release [patch|minor|major] [--alpha|--beta|--rc] [--dry-run|-d]');
    process.exit(1);
  }

  const bumpType = firstArg as VersionBumpType;

  // Check for pre-release flags
  let preReleaseType: PreReleaseType | null = null;
  if (args.includes('--alpha')) {
    preReleaseType = 'alpha';
  } else if (args.includes('--beta')) {
    preReleaseType = 'beta';
  } else if (args.includes('--rc')) {
    preReleaseType = 'rc';
  }

  return {
    bumpType,
    preReleaseType,
  };
}

const releaseConfig = parseArguments();
const isPreRelease = releaseConfig.preReleaseType !== null;

// Utility functions
function exec(command: string, options: { cwd?: string; stdio?: 'inherit' | 'pipe' } = {}) {
  try {
    console.log(`> ${command}`);
    return execSync(command, {
      stdio: options.stdio ?? 'inherit',
      cwd: options.cwd ?? PROJECT_ROOT,
      encoding: 'utf8',
    });
  } catch (error: unknown) {
    console.error(`Error executing command: ${command}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(errorMessage);
    throw error;
  }
}

function checkCommand(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

interface PackageJson {
  [key: string]: unknown;
  version: string;
}

function readJsonFile(filePath: string): PackageJson {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as PackageJson;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    throw error;
  }
}

const JSON_INDENT = 2;

function writeJsonFile(filePath: string, data: PackageJson): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, JSON_INDENT) + '\n', 'utf8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
}

// Helper function to extract pre-release type from a version string
function getPreReleaseType(version: string): PreReleaseType | null {
  const prerelease = semver.prerelease(version);
  if (!prerelease || prerelease.length === 0) {
    return null;
  }
  const preString = String(prerelease[0]);
  if (PRE_RELEASE_TYPES.includes(preString as PreReleaseType)) {
    return preString as PreReleaseType;
  }
  return null;
}

function getLatestPreReleaseTag(preType: PreReleaseType, baseVersion: string): string | null {
  try {
    // Normalize base version (remove any existing pre-release)
    const coerced = semver.coerce(baseVersion);
    const baseVersionClean = coerced ? semver.valid(coerced) : null;
    if (!baseVersionClean) {
      return null;
    }

    // Fetch tags from remote first to ensure we have the latest
    try {
      exec('git fetch --tags', { stdio: 'pipe' });
    } catch {
      // If fetch fails, continue with local tags
    }

    // List tags matching the pattern and sort them
    const tagsOutput = exec('git tag -l', { stdio: 'pipe' }).trim();
    if (!tagsOutput) {
      return null;
    }

    const tags = tagsOutput.split('\n').filter((tag) => tag.trim());
    const matchingTags: string[] = [];

    for (const tag of tags) {
      // Remove 'v' prefix
      const versionWithoutPrefix = tag.startsWith('v') ? tag.slice(1) : tag;
      const validVersion = semver.valid(versionWithoutPrefix);

      if (!validVersion) {
        continue;
      }

      // Check if it matches the base version (same major.minor.patch)
      const tagMajor = String(semver.major(validVersion));
      const tagMinor = String(semver.minor(validVersion));
      const tagPatch = String(semver.patch(validVersion));
      const tagBase = `${tagMajor}.${tagMinor}.${tagPatch}`;
      const baseMajor = String(semver.major(baseVersionClean));
      const baseMinor = String(semver.minor(baseVersionClean));
      const basePatch = String(semver.patch(baseVersionClean));
      const baseVersionTag = `${baseMajor}.${baseMinor}.${basePatch}`;

      if (tagBase === baseVersionTag) {
        const tagPreType = getPreReleaseType(validVersion);
        if (tagPreType === preType) {
          matchingTags.push(validVersion);
        }
      }
    }

    if (matchingTags.length === 0) {
      return null;
    }

    // Sort tags using semver (descending order) to get the latest
    matchingTags.sort((a, b) => semver.rcompare(a, b));

    // Return the latest version
    return matchingTags[0];
  } catch {
    // If git operations fail, return null to fall back to current version logic
    return null;
  }
}

function bumpVersion(currentVersion: string, config: ReleaseConfig): string {
  const validVersion = semver.valid(currentVersion);
  if (!validVersion) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }

  // Remove any existing pre-release to get clean base version
  const coerced = semver.coerce(validVersion);
  const cleanVersion = coerced ? semver.valid(coerced) : null;
  if (!cleanVersion) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }

  // Bump the base version
  let bumpedVersion: string | null = null;
  switch (config.bumpType) {
    case 'patch':
      bumpedVersion = semver.inc(cleanVersion, 'patch');
      break;
    case 'minor':
      bumpedVersion = semver.inc(cleanVersion, 'minor');
      break;
    case 'major':
      bumpedVersion = semver.inc(cleanVersion, 'major');
      break;
  }
  if (!bumpedVersion) {
    throw new Error(`Failed to increment ${config.bumpType} version`);
  }

  // If no pre-release flag, return the bumped version (formal release)
  if (!config.preReleaseType) {
    return bumpedVersion;
  }

  // Pre-release: check if there's already a pre-release tag for this bumped version
  const latestTag = getLatestPreReleaseTag(config.preReleaseType, bumpedVersion);
  if (latestTag) {
    // Auto-increment the pre-release number
    console.log(`Found latest ${config.preReleaseType} tag: ${latestTag}`);
    const incremented = semver.inc(latestTag, 'prerelease', config.preReleaseType);
    if (incremented) {
      return incremented;
    }
    // Fallback if semver.inc fails
    return `${bumpedVersion}-${config.preReleaseType}.1`;
  }

  // First pre-release for this version
  return `${bumpedVersion}-${config.preReleaseType}.1`;
}

function getCurrentVersion(): string {
  const pkg = readJsonFile(PACKAGE_JSON);
  return pkg.version || '1.0.0';
}

function getCurrentBranch(): string {
  try {
    return exec('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).trim();
  } catch {
    throw new Error('Not a git repository or unable to get current branch');
  }
}

function checkCargoEdit(): void {
  if (!checkCommand('cargo')) {
    throw new Error('Cargo is not installed. Please install Rust first.');
  }

  try {
    exec('cargo set-version --help', { stdio: 'pipe' });
  } catch {
    throw new Error('cargo-edit is not installed. Please install it with: cargo install cargo-edit');
  }
}

function updatePackageJson(filePath: string, newVersion: string): void {
  const pkg = readJsonFile(filePath);
  pkg.version = newVersion;
  writeJsonFile(filePath, pkg);
}

function updateCargoToml(newVersion: string): void {
  // Use cargo set-version to update workspace version
  const cratesDir = path.dirname(CRATES_CARGO_TOML);
  exec(`cargo set-version ${newVersion}`, { cwd: cratesDir });
}

function updateAllVersions(newVersion: string): void {
  console.log('\nUpdating versions...');
  updatePackageJson(PACKAGE_JSON, newVersion);
  updatePackageJson(CRATES_PACKAGE_JSON, newVersion);
  updatePackageJson(CLIENT_PACKAGE_JSON, newVersion);
  updateCargoToml(newVersion);
  console.log('✓ All versions updated');
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

const SEPARATOR_LENGTH = 60;

function displayChanges(currentVersion: string, newVersion: string, isPreReleaseType: boolean, dryRun: boolean): void {
  console.log('\n' + '='.repeat(SEPARATOR_LENGTH));
  console.log('Version Bump Summary' + (dryRun ? ' (DRY RUN)' : ''));
  console.log('='.repeat(SEPARATOR_LENGTH));
  console.log(`Current version: ${currentVersion}`);
  console.log(`New version:      ${newVersion}`);
  console.log('\nFiles to be updated:');
  console.log(`  - package.json:        ${currentVersion} → ${newVersion}`);
  console.log(`  - crates/Cargo.toml:   ${currentVersion} → ${newVersion}`);
  console.log(`  - crates/package.json:  ${currentVersion} → ${newVersion}`);
  console.log(`  - client/package.json:  ${currentVersion} → ${newVersion}`);

  if (!dryRun) {
    console.log('\nGit operations:');
    if (isPreReleaseType) {
      const currentBranch = getCurrentBranch();
      const branchName = `release/${currentBranch}/${newVersion}`;
      const tagName = `v${newVersion}`;
      console.log(`  - Create branch: ${branchName}`);
      console.log(`  - Commit changes`);
      console.log(`  - Create tag: ${tagName}`);
      console.log(`  - Push branch and tag`);
      console.log(`  - Delete branch (local and remote)`);
      console.log(`  - Switch back to original branch`);
    } else {
      const tagName = `v${newVersion}`;
      console.log(`  - Commit changes`);
      console.log(`  - Create tag: ${tagName}`);
      console.log(`  - Push commits and tag to main/master`);
    }
  } else {
    console.log('\nGit operations: (SKIPPED in dry-run mode)');
  }
  console.log('='.repeat(SEPARATOR_LENGTH) + '\n');
}

function handlePreRelease(newVersion: string, dryRun: boolean): void {
  const currentBranch = getCurrentBranch();
  const branchName = `release/${currentBranch}/${newVersion}`;
  const tagName = `v${newVersion}`;

  console.log(`\nCurrent branch: ${currentBranch}`);

  if (dryRun) {
    console.log(`[DRY RUN] Would create release branch: ${branchName}`);
    // Update versions only
    updateAllVersions(newVersion);
    console.log(`\n✓ [DRY RUN] Versions updated. No git operations performed.`);
    console.log(`✓ [DRY RUN] Would create tag: ${tagName}`);
    return;
  }

  console.log(`Creating release branch: ${branchName}`);

  // Create branch
  exec(`git checkout -b ${branchName}`);

  try {
    // Update versions
    updateAllVersions(newVersion);

    // Stage and commit
    exec('git add package.json crates/Cargo.toml crates/package.json client/package.json');
    exec(`git commit -m "chore: bump version to ${newVersion}"`);

    // Create tag
    exec(`git tag -a ${tagName} -m "Release ${newVersion}"`);

    // Push branch and tag
    exec(`git push origin ${branchName}`);
    exec(`git push origin ${tagName}`);

    // Delete branch locally and remotely
    exec(`git checkout ${currentBranch}`);
    exec(`git branch -d ${branchName}`);
    try {
      exec(`git push origin --delete ${branchName}`);
    } catch {
      console.warn(`Warning: Could not delete remote branch ${branchName}`);
    }

    console.log(`\n✓ Pre-release ${newVersion} created successfully!`);
    console.log(`✓ Tag ${tagName} pushed to trigger CI`);
  } catch (error) {
    // Cleanup on error
    exec(`git checkout ${currentBranch}`);
    try {
      exec(`git branch -D ${branchName}`);
    } catch {
      // Branch might not exist
    }
    throw error;
  }
}

function handleFormalRelease(newVersion: string, dryRun: boolean): void {
  const currentBranch = getCurrentBranch();

  if (currentBranch !== 'main' && currentBranch !== 'master') {
    throw new Error(`Formal releases can only be made from main or master branch. Current branch: ${currentBranch}`);
  }

  const tagName = `v${newVersion}`;

  console.log(`\nCurrent branch: ${currentBranch}`);

  if (dryRun) {
    console.log(`[DRY RUN] Would perform formal release`);
    // Update versions only
    updateAllVersions(newVersion);
    console.log(`\n✓ [DRY RUN] Versions updated. No git operations performed.`);
    console.log(`✓ [DRY RUN] Would create tag: ${tagName}`);
    return;
  }

  // Update versions
  updateAllVersions(newVersion);

  // Stage and commit
  exec('git add package.json crates/Cargo.toml crates/package.json client/package.json');
  exec(`git commit -m "chore: bump version to ${newVersion}"`);

  // Create tag
  exec(`git tag -a ${tagName} -m "Release ${newVersion}"`);

  // Push commits and tag
  exec(`git push origin ${currentBranch}`);
  exec(`git push origin ${tagName}`);

  console.log(`\n✓ Release ${newVersion} created successfully!`);
  console.log(`✓ Tag ${tagName} pushed to trigger CI`);
}

// Main execution
async function main() {
  try {
    if (!isDryRun) {
      execSync('git pull --rebase');
    }

    // Check prerequisites
    checkCargoEdit();

    // Get current version
    const currentVersion = getCurrentVersion();
    console.log(`Current version: ${currentVersion}`);

    // Calculate new version
    const newVersion = bumpVersion(currentVersion, releaseConfig);

    // Display changes and confirm
    displayChanges(currentVersion, newVersion, isPreRelease, isDryRun);

    if (!isDryRun) {
      const proceed = await confirm('Do you want to proceed?');
      if (!proceed) {
        console.log('Aborted.');
        process.exit(0);
      }
    } else {
      console.log('[DRY RUN] Skipping confirmation prompt');
    }

    // Execute version bump
    if (isPreRelease) {
      handlePreRelease(newVersion, isDryRun);
    } else {
      handleFormalRelease(newVersion, isDryRun);
    }

    if (isDryRun) {
      console.log('\n✓ [DRY RUN] Version bump simulation completed!');
      console.log('✓ [DRY RUN] Files have been updated. Run without --dry-run to commit changes.');
    } else {
      console.log('\n✓ Version bump completed successfully!');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n✗ Error:', errorMessage);
    process.exit(1);
  }
}

void main();
