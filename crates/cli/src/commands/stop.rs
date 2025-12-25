use std::fs;

#[cfg(windows)]
use std::process::Command;

use anyhow::{Context, Result};

use crate::{
  constants::default_pid_file,
  utils::{is_process_running, read_pid_file},
};

/// Stop a running daemon
pub fn cmd_stop() -> Result<()> {
  let pid_file = default_pid_file();

  let pid = read_pid_file(&pid_file).context("No PID file found. Is the server running?")?;

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
    Command::new("taskkill")
      .args(["/PID", &pid.to_string(), "/F"])
      .output()
      .context("Failed to kill process")?;
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

  Ok(())
}
