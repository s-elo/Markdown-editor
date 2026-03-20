use std::{fs, path::PathBuf};

use anyhow::Context;
use serde::{Deserialize, Serialize};

use crate::constants::default_metadata_file;
use crate::utils::get_real_executable_path;

#[derive(Serialize, Deserialize)]
struct ServerMetadata {
  version: String,
  executable_path: String,
}

/// - Check if if the server version is matched, If not, update the server metadata
/// - Return true if the version is matched
/// - Return false if the version is not matched
pub fn check_server() -> Result<bool, anyhow::Error> {
  let metadata_file = default_metadata_file();
  let metadata = match fs::read_to_string(&metadata_file) {
    Ok(metadata) => metadata,
    Err(e) => {
      println!(
        "No metadata file found: {}, error: {}",
        &metadata_file.display(),
        e
      );
      update_server(None)?;
      return Ok(false);
    }
  };

  let metadata: ServerMetadata = serde_json::from_str(&metadata).with_context(|| {
    format!(
      "Failed to parse metadata file: {}",
      &metadata_file.display()
    )
  })?;

  let current_version = env!("CARGO_PKG_VERSION").to_string();
  if metadata.version != current_version {
    println!(
      "Server version mismatch, prev: {}, cur {}",
      metadata.version, current_version
    );
    update_server(Some(&metadata))?;
    return Ok(false);
  }

  Ok(true)
}

fn set_metadata() -> Result<(), anyhow::Error> {
  let current_version = env!("CARGO_PKG_VERSION").to_string();
  let new_metadata = ServerMetadata {
    version: current_version,
    executable_path: get_real_executable_path()?.to_string_lossy().to_string(),
  };

  fs::write(
    default_metadata_file(),
    serde_json::to_string(&new_metadata)?,
  )
  .with_context(|| {
    format!(
      "Failed to write metadata file: {}",
      &default_metadata_file().display()
    )
  })?;

  Ok(())
}

fn update_server(metadata: Option<&ServerMetadata>) -> Result<(), anyhow::Error> {
  if let Some(metadata) = metadata {
    // stop the previous server under the executable_path
    let executable_path = PathBuf::from(&metadata.executable_path);
    if executable_path.exists() {
      let status = std::process::Command::new(&executable_path)
        .arg("stop")
        .status()?;
      if !status.success() {
        return Err(anyhow::anyhow!("Failed to stop previous server"));
      }
    }
  }

  // update the metadata
  set_metadata()?;

  Ok(())
}
