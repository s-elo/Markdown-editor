use std::fs;

#[cfg(windows)]
use std::path::PathBuf;

use anyhow::{Context, Result};

use crate::{
  constants::default_pid_file,
  utils::{is_process_running, read_pid_file},
};

#[cfg(windows)]
fn stop_service(pid_file: &PathBuf) -> () {
  // On Windows, stop the service
  use crate::utils::system_commands;

  println!("Stopping server service...");
  match system_commands::stop_windows_service("MarkdownEditorServer") {
    Ok(s) if s.success() => {
      println!("Server service stopped.");
      // Clean up PID file if it exists
      let _ = fs::remove_file(&pid_file);
    }
    Ok(s) => {
      if s.code() == Some(1062) {
        println!("Server service is not running.");
        // Clean up PID file if it exists
        let _ = fs::remove_file(&pid_file);
      } else {
        println!(
          "Warning: Failed to stop service (exit code: {})",
          s.code().unwrap_or(-1)
        );
      }
    }
    Err(e) => {
      println!("Warning: Failed to stop service: {}", e);
    }
  }
}

/// Stop a running daemon
pub fn cmd_stop() -> Result<()> {
  // Fallback to PID-based stop (for Unix or if service stop failed)
  let pid_file = default_pid_file();

  let pid = match read_pid_file(&pid_file) {
    Some(p) => p,
    None => {
      #[cfg(target_os = "macos")]
      {
        println!("No PID file found. Server may not be running.");
        return Ok(());
      }

      #[cfg(target_os = "windows")]
      {
        use crate::utils::get_service_pid;

        println!("No PID file found. Attempting to get the service PID...");
        get_service_pid().unwrap_or(0)
      }
    }
  };

  if !is_process_running(pid) {
    println!("Server is not running (stale PID file)");
    let _ = fs::remove_file(&pid_file);
    return Ok(());
  }

  println!("Stopping server with PID {}...", pid);

  #[cfg(unix)]
  {
    use nix::sys::signal::{Signal, kill};
    use nix::unistd::Pid;

    kill(Pid::from_raw(pid as i32), Signal::SIGTERM).context("Failed to send SIGTERM")?;
  }

  #[cfg(windows)]
  {
    use crate::utils::system_commands;
    system_commands::kill_windows_process(pid).context("Failed to kill process")?;
  }

  // Wait a moment and verify
  std::thread::sleep(std::time::Duration::from_millis(500));

  if is_process_running(pid) {
    println!("Server is still running. Sending SIGKILL...");
    #[cfg(unix)]
    {
      use nix::sys::signal::{Signal, kill};
      use nix::unistd::Pid;
      let _ = kill(Pid::from_raw(pid as i32), Signal::SIGKILL);
    }
  }

  let _ = fs::remove_file(&pid_file);
  println!("Server stopped");

  #[cfg(windows)]
  {
    stop_service(&pid_file);
  }

  Ok(())
}
