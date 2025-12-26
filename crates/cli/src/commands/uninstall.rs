use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result};

use crate::commands::cmd_stop;

/// Get the installation directory for the binary
fn get_install_dir() -> PathBuf {
  #[cfg(target_os = "macos")]
  {
    dirs::home_dir()
      .unwrap_or_else(|| PathBuf::from("."))
      .join(".local/bin")
  }
  #[cfg(target_os = "windows")]
  {
    dirs::data_local_dir()
      .unwrap_or_else(|| PathBuf::from("."))
      .join("mds")
  }
}

/// Get the path where the binary is installed
fn get_install_path() -> PathBuf {
  #[cfg(target_os = "windows")]
  {
    get_install_dir().join("mds.exe")
  }
  #[cfg(not(target_os = "windows"))]
  {
    get_install_dir().join("mds")
  }
}

/// Uninstall the server: stop daemon, remove autostart, remove from PATH, delete binary
pub fn cmd_uninstall() -> Result<()> {
  println!("Uninstalling Markdown Editor Server...");

  // Step 1: Stop the running daemon
  println!("Stopping server...");
  let _ = cmd_stop(); // Ignore errors if not running

  // Step 2: Remove autostart
  remove_autostart()?;

  // Step 3: Remove from PATH
  remove_from_path()?;

  // Step 4: Remove the binary
  remove_binary()?;

  // Step 5: Clean up app data (optional - keep user settings)
  // We don't remove ~/.md-server to preserve user settings

  println!("\n✓ Uninstallation complete!");
  println!("  Note: User settings in ~/.md-server were preserved.");
  println!("  To remove all data, delete ~/.md-server manually.");

  Ok(())
}

/// Remove the installed binary
fn remove_binary() -> Result<()> {
  let install_path = get_install_path();

  if install_path.exists() {
    fs::remove_file(&install_path)
      .with_context(|| format!("Failed to remove binary: {}", install_path.display()))?;
    println!("Removed binary: {}", install_path.display());

    // Try to remove the install directory if empty
    let install_dir = get_install_dir();
    if install_dir
      .read_dir()
      .map(|mut d| d.next().is_none())
      .unwrap_or(false)
    {
      let _ = fs::remove_dir(&install_dir);
    }
  } else {
    println!("Binary not found at {}", install_path.display());
  }

  Ok(())
}

/// Remove autostart registration (macOS)
#[cfg(target_os = "macos")]
fn remove_autostart() -> Result<()> {
  let plist_path = dirs::home_dir()
    .context("Could not find home directory")?
    .join("Library/LaunchAgents/com.markdown-editor.mds.plist");

  if plist_path.exists() {
    // Unload the LaunchAgent first
    let _ = Command::new("launchctl")
      .args(["unload", plist_path.to_str().unwrap()])
      .status();

    fs::remove_file(&plist_path)?;
    println!("Removed LaunchAgent");
  }

  Ok(())
}

/// Remove autostart registration (Windows)
#[cfg(target_os = "windows")]
fn remove_autostart() -> Result<()> {
  use winreg::RegKey;
  use winreg::enums::*;

  let hkcu = RegKey::predef(HKEY_CURRENT_USER);
  if let Ok(run_key) =
    hkcu.open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\Run", KEY_WRITE)
  {
    let _ = run_key.delete_value("MarkdownEditorServer");
    println!("Removed autostart from Windows Registry");
  }

  Ok(())
}

/// Remove from PATH (macOS)
#[cfg(target_os = "macos")]
fn remove_from_path() -> Result<()> {
  // Remove symlink if it exists
  let symlink_path = Path::new("/usr/local/bin/mds");
  if symlink_path.exists() || symlink_path.is_symlink() {
    match fs::remove_file(symlink_path) {
      Ok(_) => println!("Removed symlink: {}", symlink_path.display()),
      Err(_) => println!("Could not remove symlink (may need sudo)"),
    }
  }

  // Remove from shell configs
  let home = dirs::home_dir().context("Could not find home directory")?;
  let install_dir = get_install_dir();

  remove_from_shell_config(&home.join(".zshrc"), &install_dir)?;
  remove_from_shell_config(&home.join(".bashrc"), &install_dir)?;

  Ok(())
}

/// Remove the export line from a shell config file
#[cfg(target_os = "macos")]
fn remove_from_shell_config(file_path: &Path, _install_dir: &Path) -> Result<()> {
  if !file_path.exists() {
    return Ok(());
  }

  let file = fs::File::open(file_path)?;
  let reader = BufReader::new(file);
  let mut lines: Vec<String> = Vec::new();
  let mut found = false;
  let mut skip_next = false;

  for line in reader.lines() {
    let line = line?;

    // Skip the comment and the export line
    if line.contains("# Markdown Editor Server") {
      found = true;
      skip_next = true;
      continue;
    }

    if skip_next && line.starts_with("export PATH=") && line.contains(".local/bin") {
      skip_next = false;
      continue;
    }

    skip_next = false;
    lines.push(line);
  }

  if found {
    let mut file = fs::File::create(file_path)?;
    for line in lines {
      writeln!(file, "{}", line)?;
    }
    println!("Removed PATH entry from {}", file_path.display());
  }

  Ok(())
}

/// Remove from PATH (Windows)
#[cfg(target_os = "windows")]
fn remove_from_path() -> Result<()> {
  use winreg::RegKey;
  use winreg::enums::*;

  let hkcu = RegKey::predef(HKEY_CURRENT_USER);
  let env = hkcu
    .open_subkey_with_flags("Environment", KEY_READ | KEY_WRITE)
    .context("Failed to open Environment registry key")?;

  let current_path: String = env.get_value("Path").unwrap_or_default();
  let install_dir = get_install_dir();
  let install_dir_str = install_dir.to_string_lossy();

  if current_path
    .to_lowercase()
    .contains(&install_dir_str.to_lowercase())
  {
    // Remove the install directory from PATH
    let new_path: String = current_path
      .split(';')
      .filter(|p| !p.eq_ignore_ascii_case(&install_dir_str))
      .collect::<Vec<_>>()
      .join(";");

    env.set_value("Path", &new_path)?;
    println!("Removed {} from PATH", install_dir.display());
  }

  Ok(())
}
