use std::fs;
use std::path::PathBuf;

use sysinfo::System;

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

#[cfg(target_os = "windows")]
pub enum CheckAutoStartStatus {
  Registered,
  NotRegistered,
  NotExist,
  Error,
}
/// Check if the service is registered for autostart (Windows)
#[cfg(target_os = "windows")]
pub fn is_autostart_registered() -> Result<CheckAutoStartStatus, anyhow::Error> {
  use std::process::Command;

  let query_config = Command::new("sc.exe")
    .args(["qc", "MarkdownEditorServer"])
    .output();

  let service_exists = query_config
    .as_ref()
    .map(|output| output.status.success())
    .unwrap_or(false);

  if service_exists {
    // Check if it's already set to auto start
    if let Ok(output) = &query_config {
      let stdout = String::from_utf8_lossy(&output.stdout);
      if stdout.contains("START_TYPE         : 2   AUTO_START") {
        return Ok(CheckAutoStartStatus::Registered);
      }
    } else {
      return Ok(CheckAutoStartStatus::Error);
    }

    return Ok(CheckAutoStartStatus::NotRegistered);
  }

  Ok(CheckAutoStartStatus::NotExist)
}

#[cfg(target_os = "windows")]
/// Get the PID of the Windows service if it's running
pub fn get_service_pid() -> Option<u32> {
  use std::process::Command;

  let output = Command::new("sc.exe")
    .args(["queryex", "MarkdownEditorServer"])
    .output()
    .ok()?;

  if !output.status.success() {
    return None;
  }

  let stdout = String::from_utf8_lossy(&output.stdout);

  // Check if the service is actually running
  let is_running = stdout.contains("STATE              : 4  RUNNING");
  if !is_running {
    return None;
  }

  // Parse the PID from the output
  // The output format is like:
  // SERVICE_NAME: MarkdownEditorServer
  //         TYPE               : 10  WIN32_OWN_PROCESS
  //         STATE              : 4  RUNNING
  //         WIN32_EXIT_CODE    : 0  (0x0)
  //         SERVICE_EXIT_CODE  : 0  (0x0)
  //         CHECKPOINT         : 0x0
  //         WAIT_HINT          : 0x0
  //         PID                : 1234
  //         FLAGS              :

  for line in stdout.lines() {
    if line.trim().starts_with("PID") {
      if let Some(pid_str) = line.split(':').nth(1) {
        if let Ok(pid) = pid_str.trim().parse::<u32>() {
          if pid > 0 {
            // PID 0 is invalid
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
    // Write PID to file
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
