use std::path::PathBuf;

#[cfg(debug_assertions)]
pub const DEFAULT_PORT: u16 = 3024;
#[cfg(not(debug_assertions))]
pub const DEFAULT_PORT: u16 = 7024;

pub const DEFAULT_HOST: &str = "127.0.0.1";

#[cfg(debug_assertions)]
pub fn default_log_dir() -> PathBuf {
  PathBuf::from("logs")
}
#[cfg(not(debug_assertions))]
pub fn default_log_dir() -> PathBuf {
  dirs::home_dir()
    .unwrap_or_else(|| PathBuf::from("."))
    .join(".md-server/logs")
}

#[cfg(debug_assertions)]
pub fn default_pid_file() -> PathBuf {
  PathBuf::from("md-server.pid")
}
#[cfg(not(debug_assertions))]
pub fn default_pid_file() -> PathBuf {
  dirs::home_dir()
    .unwrap_or_else(|| PathBuf::from("."))
    .join(".md-server/md-server.pid")
}

#[cfg(debug_assertions)]
pub fn default_editor_settings_file() -> PathBuf {
  use server::utils::project_root;
  project_root(&["editor-settings.json"])
}
#[cfg(not(debug_assertions))]
pub fn default_editor_settings_file() -> PathBuf {
  dirs::home_dir()
    .unwrap_or_else(|| PathBuf::from("."))
    .join(".md-server/editor-settings.json")
}
