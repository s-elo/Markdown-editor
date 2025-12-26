use std::fs;
use std::path::PathBuf;

use sysinfo::System;

/// Get the directory containing the executable (for debug builds)
/// Falls back to "." if the executable path cannot be determined
#[cfg(debug_assertions)]
pub fn exe_dir() -> PathBuf {
  std::env::current_exe()
    .ok()
    .and_then(|p| p.parent().map(|p| p.to_path_buf()))
    .unwrap_or_else(|| PathBuf::from("."))
}

/// Get the app data directory in user's home (for release builds)
/// Falls back to "." if home directory cannot be determined
#[cfg(not(debug_assertions))]
pub fn app_data_dir() -> PathBuf {
  dirs::home_dir()
    .unwrap_or_else(|| PathBuf::from("."))
    .join(".md-server")
}

/// Read PID from file
pub fn read_pid_file(path: &PathBuf) -> Option<u32> {
  fs::read_to_string(path)
    .ok()
    .and_then(|s| s.trim().parse().ok())
}

/// Check if a process with the given PID is running
pub fn is_process_running(pid: u32) -> bool {
  let mut sys = System::new();
  sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
  sys.process(sysinfo::Pid::from_u32(pid)).is_some()
}
