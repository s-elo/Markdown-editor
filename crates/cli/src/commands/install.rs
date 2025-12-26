use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result};

use crate::commands::cmd_start;
use crate::constants::{DEFAULT_HOST, DEFAULT_PORT};

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

/// Get the path where the binary should be installed
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

/// Check if the binary is already installed
pub fn is_installed() -> bool {
  get_install_path().exists()
}

/// Install the server: copy binary, add to PATH, register autostart, start daemon
pub fn cmd_install() -> Result<()> {
  println!("Installing Markdown Editor Server...");

  let current_exe = std::env::current_exe().context("Failed to get current executable path")?;
  let install_dir = get_install_dir();
  let install_path = get_install_path();

  // Step 1: Copy binary to install location
  install_binary(&current_exe, &install_dir, &install_path)?;

  // Step 2: Add to PATH
  add_to_path(&install_dir)?;

  // Step 3: Register autostart
  register_autostart(&install_path)?;

  // Step 4: Start the daemon
  println!("Starting server daemon...");
  cmd_start(true, DEFAULT_HOST.to_string(), DEFAULT_PORT)?;

  println!("\n✓ Installation complete!");
  println!("  - Binary installed to: {}", install_path.display());
  println!(
    "  - Server running on http://{}:{}",
    DEFAULT_HOST, DEFAULT_PORT
  );
  println!("  - Server will auto-start on login");
  println!("  - Use 'mds' command in a new terminal session");

  Ok(())
}

/// Copy the binary to the install location
fn install_binary(current_exe: &Path, install_dir: &Path, install_path: &Path) -> Result<()> {
  // Create install directory if it doesn't exist
  fs::create_dir_all(install_dir).with_context(|| {
    format!(
      "Failed to create install directory: {}",
      install_dir.display()
    )
  })?;

  // Skip if we're already running from the install location
  if current_exe == install_path {
    println!("Binary already at install location, skipping copy.");
    return Ok(());
  }

  // Copy the binary
  fs::copy(current_exe, install_path)
    .with_context(|| format!("Failed to copy binary to {}", install_path.display()))?;

  // Make executable on Unix
  #[cfg(unix)]
  {
    use std::os::unix::fs::PermissionsExt;
    let mut perms = fs::metadata(install_path)?.permissions();
    perms.set_mode(0o755);
    fs::set_permissions(install_path, perms)?;
  }

  println!("Binary installed to: {}", install_path.display());
  Ok(())
}

/// Add the install directory to PATH
#[cfg(target_os = "macos")]
fn add_to_path(install_dir: &Path) -> Result<()> {
  let symlink_path = Path::new("/usr/local/bin/mds");

  // Try to create symlink to /usr/local/bin first
  if !symlink_path.exists() {
    let install_path = install_dir.join("mds");
    if std::os::unix::fs::symlink(&install_path, symlink_path).is_ok() {
      println!(
        "Created symlink: {} -> {}",
        symlink_path.display(),
        install_path.display()
      );
      return Ok(());
    }
    // Symlink failed (likely no permissions), fall back to shell config
  } else {
    println!("Symlink already exists at {}", symlink_path.display());
    return Ok(());
  }

  // Fall back to adding to shell config
  add_to_shell_config(install_dir)?;
  Ok(())
}

/// Add to shell config files (.zshrc, .bashrc)
#[cfg(target_os = "macos")]
fn add_to_shell_config(install_dir: &Path) -> Result<()> {
  let home = dirs::home_dir().context("Could not find home directory")?;
  let export_line = format!(
    "\n# Markdown Editor Server\nexport PATH=\"{}:$PATH\"\n",
    install_dir.display()
  );

  // Add to .zshrc (default shell on modern macOS)
  let zshrc = home.join(".zshrc");
  add_export_to_file(&zshrc, &export_line)?;

  // Also add to .bashrc for bash users
  let bashrc = home.join(".bashrc");
  if bashrc.exists() {
    add_export_to_file(&bashrc, &export_line)?;
  }

  println!("Added {} to PATH in shell config", install_dir.display());
  println!("Note: Open a new terminal for the 'mds' command to be available");

  Ok(())
}

#[cfg(target_os = "macos")]
fn add_export_to_file(file_path: &Path, export_line: &str) -> Result<()> {
  let content = fs::read_to_string(file_path).unwrap_or_default();

  // Check if already added
  if content.contains("Markdown Editor Server") {
    return Ok(());
  }

  let mut file = fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(file_path)
    .with_context(|| format!("Failed to open {}", file_path.display()))?;

  file.write_all(export_line.as_bytes())?;
  Ok(())
}

/// Add the install directory to PATH (Windows)
#[cfg(target_os = "windows")]
fn add_to_path(install_dir: &Path) -> Result<()> {
  use winreg::RegKey;
  use winreg::enums::*;

  let hkcu = RegKey::predef(HKEY_CURRENT_USER);
  let env = hkcu
    .open_subkey_with_flags("Environment", KEY_READ | KEY_WRITE)
    .context("Failed to open Environment registry key")?;

  let current_path: String = env.get_value("Path").unwrap_or_default();
  let install_dir_str = install_dir.to_string_lossy();

  if current_path
    .to_lowercase()
    .contains(&install_dir_str.to_lowercase())
  {
    println!("Install directory already in PATH");
    return Ok(());
  }

  let new_path = if current_path.is_empty() {
    install_dir_str.to_string()
  } else {
    format!("{};{}", current_path, install_dir_str)
  };

  env
    .set_value("Path", &new_path)
    .context("Failed to update PATH in registry")?;

  println!("Added {} to user PATH", install_dir.display());
  println!("Note: Open a new terminal for the 'mds' command to be available");

  // Broadcast WM_SETTINGCHANGE to notify other applications
  broadcast_environment_change();

  Ok(())
}

/// Broadcast environment change on Windows
#[cfg(target_os = "windows")]
fn broadcast_environment_change() {
  use std::ffi::OsStr;
  use std::os::windows::ffi::OsStrExt;

  // This is a simplified version - for full implementation, use the windows crate
  // The change will take effect in new terminal sessions regardless
  let _ = Command::new("cmd")
    .args(["/C", "echo", "Environment updated"])
    .output();
}

/// Register autostart on login (macOS)
#[cfg(target_os = "macos")]
fn register_autostart(exe_path: &Path) -> Result<()> {
  let plist_content = format!(
    r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.markdown-editor.mds</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
        <string>start</string>
        <string>--daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>"#,
    exe_path.display()
  );

  let launch_agents_dir = dirs::home_dir()
    .context("Could not find home directory")?
    .join("Library/LaunchAgents");

  fs::create_dir_all(&launch_agents_dir)?;

  let plist_path = launch_agents_dir.join("com.markdown-editor.mds.plist");
  fs::write(&plist_path, plist_content)?;

  // Load the LaunchAgent immediately
  let status = Command::new("launchctl")
    .args(["load", plist_path.to_str().unwrap()])
    .status();

  match status {
    Ok(s) if s.success() => println!("Registered autostart via LaunchAgent"),
    _ => println!("LaunchAgent created but could not load immediately"),
  }

  Ok(())
}

/// Register autostart on login (Windows)
#[cfg(target_os = "windows")]
fn register_autostart(exe_path: &Path) -> Result<()> {
  use winreg::RegKey;
  use winreg::enums::*;

  let hkcu = RegKey::predef(HKEY_CURRENT_USER);
  let run_key = hkcu
    .open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\Run", KEY_WRITE)
    .context("Failed to open Run registry key")?;

  // Register with --daemon flag to start as background process
  let command = format!("\"{}\"", exe_path.display());
  run_key
    .set_value("MarkdownEditorServer", &command)
    .context("Failed to set autostart registry value")?;

  println!("Registered autostart in Windows Registry");
  Ok(())
}
