#[cfg(target_os = "macos")]
use std::io::Write;
use std::path::Path;

use anyhow::{Context, Result};

// use crate::utils::system_commands;

/// Add the binary's current directory to PATH so `mds` can be used as a CLI command.
/// On macOS: creates a symlink at `~/.local/bin/mds` (user-writable, no sudo needed),
///          and ensures `~/.local/bin` is in PATH. Falls back to adding `~/.local/bin`
///          to PATH if symlink creation fails.
/// On Windows: adds the exe directory to the user's PATH registry entry.
pub fn add_to_path() -> Result<()> {
  let exe_path = std::env::current_exe().context("Failed to get current executable path")?;

  add_to_path_inner(&exe_path)
}

#[cfg(target_os = "macos")]
fn add_to_path_inner(exe_path: &Path) -> Result<()> {
  let home = dirs::home_dir().context("Could not find home directory")?;
  let local_bin_dir = home.join(".local").join("bin");
  let local_bin_path = local_bin_dir.join("mds");

  // Create ~/.local/bin directory if it doesn't exist
  if !local_bin_dir.exists() {
    std::fs::create_dir_all(&local_bin_dir)
      .with_context(|| format!("Failed to create directory: {}", local_bin_dir.display()))?;
    println!("Created directory: {}", local_bin_dir.display());
  }

  // Try to create symlink in ~/.local/bin
  match try_create_symlink(exe_path, &local_bin_path) {
    Ok(_) => {
      println!(
        "✓ Created symlink: {} -> {}",
        local_bin_path.display(),
        exe_path.display()
      );
    }
    Err(e) => {
      println!("Warning: Failed to create symlink in ~/.local/bin: {}", e);
      println!("Will add ~/.local/bin to PATH instead");
    }
  }

  // Ensure ~/.local/bin is in PATH (whether symlink succeeded or not)
  ensure_local_bin_in_path(&local_bin_dir)?;
  Ok(())
}

/// Try to create or update a symlink, handling existing symlinks gracefully.
/// Returns Ok(()) on success, Err on failure (including permission errors).
#[cfg(target_os = "macos")]
fn try_create_symlink(exe_path: &Path, symlink_path: &Path) -> Result<()> {
  if symlink_path.exists() || symlink_path.is_symlink() {
    // Check if existing symlink points to the correct target
    if let Ok(target) = std::fs::read_link(symlink_path) {
      if target == exe_path {
        println!(
          "✓ Symlink already exists and points to correct target: {} -> {}",
          symlink_path.display(),
          exe_path.display()
        );
        return Ok(()); // Already correctly linked
      }
      println!(
        "Updating existing symlink: {} -> {}",
        symlink_path.display(),
        exe_path.display()
      );
    }
    // Remove existing symlink/file to update it
    std::fs::remove_file(symlink_path).with_context(|| {
      format!(
        "Failed to remove existing symlink: {}",
        symlink_path.display()
      )
    })?;
  }

  // Create new symlink
  std::os::unix::fs::symlink(exe_path, symlink_path)
    .with_context(|| format!("Failed to create symlink: {}", symlink_path.display()))?;

  Ok(())
}

/// Ensure ~/.local/bin is in PATH by adding it to shell config files.
#[cfg(target_os = "macos")]
fn ensure_local_bin_in_path(local_bin_dir: &Path) -> Result<()> {
  let home = dirs::home_dir().context("Could not find home directory")?;
  let export_line = format!(
    "\n# Add ~/.local/bin to PATH if not already present\nexport PATH=\"$HOME/.local/bin:$PATH\"\n"
  );

  let zshrc = home.join(".zshrc");
  add_export_to_file(&zshrc, &export_line)?;

  let bashrc = home.join(".bashrc");
  if bashrc.exists() {
    add_export_to_file(&bashrc, &export_line)?;
  }

  println!("Ensured {} is in PATH", local_bin_dir.display());
  println!("Note: Open a new terminal for the 'mds' command to be available");

  Ok(())
}

#[cfg(target_os = "macos")]
fn add_export_to_file(file_path: &Path, export_line: &str) -> Result<()> {
  let content = std::fs::read_to_string(file_path).unwrap_or_default();

  // Check if ~/.local/bin is already in PATH
  if content.contains("$HOME/.local/bin") || content.contains("~/.local/bin") {
    return Ok(()); // Already in PATH
  }

  let mut file = std::fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(file_path)
    .with_context(|| format!("Failed to open {}", file_path.display()))?;

  file.write_all(export_line.as_bytes())?;
  Ok(())
}

#[cfg(target_os = "windows")]
fn add_to_path_inner(exe_dir: &Path, _exe_path: &Path) -> Result<()> {
  use winreg::RegKey;
  use winreg::enums::*;

  let hkcu = RegKey::predef(HKEY_CURRENT_USER);
  let env = hkcu
    .open_subkey_with_flags("Environment", KEY_READ | KEY_WRITE)
    .context("Failed to open Environment registry key")?;

  let current_path: String = env.get_value("Path").unwrap_or_default();
  let exe_dir_str = exe_dir.to_string_lossy();

  if current_path
    .to_lowercase()
    .contains(&exe_dir_str.to_lowercase())
  {
    return Ok(());
  }

  let new_path = if current_path.is_empty() {
    exe_dir_str.to_string()
  } else {
    format!("{};{}", current_path, exe_dir_str)
  };

  env
    .set_value("Path", &new_path)
    .context("Failed to update PATH in registry")?;

  println!("Added {} to user PATH", exe_dir.display());
  println!("Note: Open a new terminal for the 'mds' command to be available");

  Ok(())
}

// #[cfg(target_os = "windows")]
// pub fn delete_windows_service(service_name: &str) -> Result<()> {
//   // Delete the service
//   match system_commands::delete_windows_service(service_name) {
//     Ok(s) if s.success() => {
//       println!("Removed service");
//     }
//     Ok(s) => {
//       println!(
//         "Warning: Failed to delete service (exit code: {}), it may need manual removal",
//         s.code().unwrap_or(-1)
//       );
//     }
//     Err(e) => {
//       println!("Warning: Failed to delete service: {}", e);
//     }
//   }

//   Ok(())
// }
