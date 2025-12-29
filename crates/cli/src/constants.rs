use std::path::PathBuf;

use crate::utils::app_data_dir;

#[cfg(debug_assertions)]
pub const DEFAULT_PORT: u16 = 3024;
#[cfg(not(debug_assertions))]
pub const DEFAULT_PORT: u16 = 7024;

pub const DEFAULT_HOST: &str = "127.0.0.1";

pub fn default_log_dir() -> PathBuf {
  app_data_dir().join("logs")
}

pub fn default_pid_file() -> PathBuf {
  app_data_dir().join("mds.pid")
}

pub fn default_editor_settings_file() -> PathBuf {
  app_data_dir().join("editor-settings.json")
}
