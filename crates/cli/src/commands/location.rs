use std::env;

use anyhow::{Context, Result};

use crate::utils::app_data_dir;

/// Show the current executable location and app data location
pub fn cmd_location() -> Result<()> {
  // Get the current executable path (may be a symlink)
  let exe_path = env::current_exe().context("Failed to get current executable path")?;

  // Resolve symlinks to get the actual path
  let actual_path =
    std::fs::canonicalize(&exe_path).context("Failed to resolve executable path")?;

  // Get the app data directory
  let app_data_path = app_data_dir();

  println!("Executable location (symlink): {}", exe_path.display());
  println!("Executable location (actual): {}", actual_path.display());
  println!("App data location: {}", app_data_path.display());

  Ok(())
}
