#[cfg(target_os = "macos")]
use std::io::Write;
use std::path::Path;

use anyhow::{Context, Result};

// use crate::utils::system_commands;

/// Add the binary's current directory to PATH so `mds` can be used as a CLI command.
/// On macOS: creates a symlink at `/usr/local/bin/mds`, or falls back to shell config.
/// On Windows: adds the exe directory to the user's PATH registry entry.
pub fn add_to_path() -> Result<()> {
  let exe_path = std::env::current_exe().context("Failed to get current executable path")?;
  let exe_dir = exe_path
    .parent()
    .context("Failed to get executable directory")?;

  add_to_path_inner(exe_dir, &exe_path)
}

#[cfg(target_os = "macos")]
fn add_to_path_inner(exe_dir: &Path, exe_path: &Path) -> Result<()> {
  let symlink_path = Path::new("/usr/local/bin/mds");

  if symlink_path.exists() || symlink_path.is_symlink() {
    if let Ok(target) = std::fs::read_link(symlink_path) {
      if target == exe_path {
        return Ok(());
      }
    }
    if std::fs::remove_file(symlink_path).is_ok() {
      if std::os::unix::fs::symlink(exe_path, symlink_path).is_ok() {
        println!(
          "Updated symlink: {} -> {}",
          symlink_path.display(),
          exe_path.display()
        );
        return Ok(());
      }
    }
  } else if std::os::unix::fs::symlink(exe_path, symlink_path).is_ok() {
    println!(
      "Created symlink: {} -> {}",
      symlink_path.display(),
      exe_path.display()
    );
    return Ok(());
  }

  // Symlink approach failed (likely due to permissions), fall back to shell config
  add_to_shell_config(exe_dir)?;
  Ok(())
}

#[cfg(target_os = "macos")]
fn add_to_shell_config(exe_dir: &Path) -> Result<()> {
  let home = dirs::home_dir().context("Could not find home directory")?;
  let export_line = format!(
    "\n# Markdown Editor Server\nexport PATH=\"{}:$PATH\"\n",
    exe_dir.display()
  );

  let zshrc = home.join(".zshrc");
  add_export_to_file(&zshrc, &export_line)?;

  let bashrc = home.join(".bashrc");
  if bashrc.exists() {
    add_export_to_file(&bashrc, &export_line)?;
  }

  println!("Added {} to PATH in shell config", exe_dir.display());
  println!("Note: Open a new terminal for the 'mds' command to be available");

  Ok(())
}

#[cfg(target_os = "macos")]
fn add_export_to_file(file_path: &Path, export_line: &str) -> Result<()> {
  let content = std::fs::read_to_string(file_path).unwrap_or_default();

  if content.contains("Markdown Editor Server") {
    return Ok(());
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
