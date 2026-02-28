use std::fs;

use anyhow::Result;

use crate::{
  constants::default_pid_file,
  utils::{is_process_running, read_pid_file},
};

/// Check if the server is running
pub fn cmd_status() -> Result<()> {
  #[cfg(target_os = "windows")]
  {
    // On Windows, first check if the service is running
    use crate::utils::get_service_pid;

    if let Some(pid) = get_service_pid() {
      if is_process_running(pid) {
        println!("Server service is running with PID {}", pid);
      } else {
        // Service exists but not running
        println!("Server service exists but is not running");
      }
    }
  }

  // Fallback to PID file check (Unix or if service check failed)
  let pid_file = default_pid_file();

  match read_pid_file(&pid_file) {
    Some(pid) => {
      if is_process_running(pid) {
        println!("Server is running with PID {}", pid);
      } else {
        println!("Server is not running (stale PID file)");
        let _ = fs::remove_file(&pid_file);
      }
    }
    None => {
      println!("Server is not running (no PID file)");
    }
  }

  // Show autostart status (only on Windows for now)
  #[cfg(target_os = "windows")]
  {
    use crate::utils::{CheckAutoStartStatus, is_autostart_registered};

    match is_autostart_registered() {
      Ok(CheckAutoStartStatus::Registered) => {
        println!("Server is registered for auto-start");
      }
      Ok(CheckAutoStartStatus::NotExist) => {
        println!("Server does not exist");
      }
      _ => {
        println!("Server is not registered for auto-start");
      }
    }
  }

  Ok(())
}
