use std::env;

use anyhow::{Context, Result};

use crate::utils::app_data_dir;

/// Show the current executable location and app data location
pub fn cmd_location() -> Result<()> {
  // Get the current executable path
  let exe_path = env::current_exe().context("Failed to get current executable path")?;

  // Get the app data directory
  let app_data_path = app_data_dir();

  println!("Executable location: {}", exe_path.display());
  println!("App data location: {}", app_data_path.display());

  Ok(())
}
