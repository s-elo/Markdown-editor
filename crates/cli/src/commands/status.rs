use std::fs;

use anyhow::Result;

use crate::{
  constants::default_pid_file,
  utils::{is_process_running, read_pid_file},
};

/// Check if the server is running
pub fn cmd_status() -> Result<()> {
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

  Ok(())
}
