use std::fs;
use std::path::PathBuf;

use sysinfo::System;

pub mod system_commands;

/// Get the stored home directory (for service runs)
#[cfg(target_os = "windows")]
fn get_stored_home_dir() -> Option<PathBuf> {
  use winreg::RegKey;
  use winreg::enums::*;

  let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
  let mds_key = hklm.open_subkey("Software\\MarkdownEditorServer").ok()?;

  let home_dir_str: String = mds_key.get_value("HomeDir").ok()?;
  let path = PathBuf::from(home_dir_str);
  if path.exists() { Some(path) } else { None }
}

/// Get the app data directory in user's home (for release builds)
pub fn app_data_dir() -> PathBuf {
  #[cfg(not(debug_assertions))]
  let data_path = PathBuf::from(".md-server");
  #[cfg(debug_assertions)]
  let data_path = PathBuf::from(".md-server-dev");

  #[cfg(target_os = "windows")]
  {
    if let Some(home) = get_stored_home_dir() {
      return home.join(data_path);
    }
  }

  dirs::home_dir()
    .unwrap_or_else(|| PathBuf::from("."))
    .join(data_path)
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

#[cfg(target_os = "windows")]
/// Get the PID of the Windows service if it's running
pub fn get_service_pid() -> Option<u32> {
  use crate::utils::system_commands::query_windows_service_ex;

  let output = query_windows_service_ex("MarkdownEditorServer").ok()?;

  if !output.status.success() {
    return None;
  }

  let stdout = String::from_utf8_lossy(&output.stdout);

  let is_running = stdout.contains("STATE              : 4  RUNNING");
  if !is_running {
    return None;
  }

  for line in stdout.lines() {
    if line.trim().starts_with("PID") {
      if let Some(pid_str) = line.split(':').nth(1) {
        if let Ok(pid) = pid_str.trim().parse::<u32>() {
          if pid > 0 {
            return Some(pid);
          }
        }
      }
    }
  }

  None
}

/// Get the service PID using sc queryex and write it to the PID file
#[cfg(target_os = "windows")]
pub fn get_and_write_service_pid(pid_file: &PathBuf) -> Result<(), anyhow::Error> {
  let pid = get_service_pid().unwrap_or(0);

  if pid > 0 {
    if let Some(parent) = pid_file.parent() {
      fs::create_dir_all(parent)?;
    } else {
      println!(
        "Warning: Could not determine parent directory for PID file: {}",
        pid_file.display()
      );
    }
    match fs::write(pid_file, pid.to_string()) {
      Ok(_) => {
        println!("Wrote service PID {} to file {}", pid, pid_file.display());
      }
      Err(e) => {
        println!(
          "Warning: Could not write PID to file {}: {}",
          pid_file.display(),
          e
        );
      }
    }
  }

  Ok(())
}

/// Get the real path for the symlink case
pub fn get_real_executable_path() -> Result<PathBuf, anyhow::Error> {
  let exe_path = std::env::current_exe()?;
  let actual_path = std::fs::canonicalize(&exe_path)?;
  Ok(actual_path)
}
