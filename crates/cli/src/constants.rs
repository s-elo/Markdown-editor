use std::path::PathBuf;

#[cfg(not(debug_assertions))]
use crate::utils::app_data_dir;
#[cfg(debug_assertions)]
use crate::utils::exe_dir;

#[cfg(debug_assertions)]
pub const DEFAULT_PORT: u16 = 3024;
#[cfg(not(debug_assertions))]
pub const DEFAULT_PORT: u16 = 7024;

pub const DEFAULT_HOST: &str = "127.0.0.1";

#[cfg(debug_assertions)]
pub fn default_log_dir() -> PathBuf {
  exe_dir().join("logs")
}
#[cfg(not(debug_assertions))]
pub fn default_log_dir() -> PathBuf {
  app_data_dir().join("logs")
}

#[cfg(debug_assertions)]
pub fn default_pid_file() -> PathBuf {
  exe_dir().join("md-server.pid")
}
#[cfg(not(debug_assertions))]
pub fn default_pid_file() -> PathBuf {
  app_data_dir().join("md-server.pid")
}

#[cfg(debug_assertions)]
pub fn default_editor_settings_file() -> PathBuf {
  exe_dir().join("editor-settings.json")
}
#[cfg(not(debug_assertions))]
pub fn default_editor_settings_file() -> PathBuf {
  app_data_dir().join("editor-settings.json")
}
