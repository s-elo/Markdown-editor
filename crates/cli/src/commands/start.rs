use std::fs;
use std::path::PathBuf;

use anyhow::Result;
use server::ServerConfig;

use crate::{
  constants::{default_editor_settings_file, default_log_dir, default_pid_file},
  utils::{is_process_running, read_pid_file},
};

/// Start the server (foreground or daemon mode)
pub fn cmd_start(daemon: bool, host: String, port: u16) -> Result<()> {
  let pid_file = default_pid_file();

  // Check if already running
  if let Some(pid) = read_pid_file(&pid_file) {
    if is_process_running(pid) {
      println!(
        "Server is already running at {}:{} with PID {}",
        host, port, pid
      );
      return Ok(());
    }
    // Stale PID file, remove it
    let _ = fs::remove_file(&pid_file);
  }

  if daemon {
    start_daemon(host, port, &pid_file)?;
  } else {
    start_foreground(host, port)?;
  }

  Ok(())
}

/// Start the server in foreground mode
fn start_foreground(host: String, port: u16) -> Result<()> {
  println!("Starting server on {}:{}...", host, port);

  let config = ServerConfig {
    host,
    port,
    log_dir: default_log_dir(),
    log_to_terminal: true,
    editor_settings_file: default_editor_settings_file(),
  };

  let rt = tokio::runtime::Runtime::new()?;
  rt.block_on(server::run_server(config))?;

  Ok(())
}

/// Start the server as a background daemon
#[cfg(unix)]
fn start_daemon(host: String, port: u16, pid_file: &PathBuf) -> Result<()> {
  use daemonize::Daemonize;

  println!("Starting server daemon on {}:{}...", host, port);

  // Ensure PID file directory exists
  if let Some(parent) = pid_file.parent() {
    fs::create_dir_all(parent)?;
  }

  let daemonize = Daemonize::new()
    .pid_file(pid_file)
    .chown_pid_file(true)
    .working_directory(".");

  // Daemonize - after this, we ARE the daemon process
  match daemonize.start() {
    Ok(_) => {
      // Now running as daemon - start the server
      let config = ServerConfig {
        host,
        port,
        log_dir: default_log_dir(),
        log_to_terminal: false,
        editor_settings_file: default_editor_settings_file(),
      };

      let rt = tokio::runtime::Runtime::new()?;
      rt.block_on(server::run_server(config))?;

      println!("Server started.");
    }
    Err(e) => {
      anyhow::bail!("Failed to daemonize: {}", e);
    }
  }

  Ok(())
}

/// Start the server as a background daemon on Windows
#[cfg(windows)]
fn start_daemon(host: String, port: u16, pid_file: &PathBuf) -> Result<()> {
  use std::os::windows::process::CommandExt;
  use std::process::Command;

  // Windows process creation flags
  const DETACHED_PROCESS: u32 = 0x00000008;
  const CREATE_NO_WINDOW: u32 = 0x08000000;
  const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;

  println!("Starting server daemon on {}:{}...", host, port);

  // Ensure PID file directory exists
  if let Some(parent) = pid_file.parent() {
    fs::create_dir_all(parent)?;
  }

  // Get the current executable path
  let exe_path = std::env::current_exe()?;

  // Spawn the server as a detached process (without --daemon flag to run in foreground mode)
  let child = Command::new(&exe_path)
    .args(["start", "--host", &host, "--port", &port.to_string()])
    .creation_flags(DETACHED_PROCESS | CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP)
    .spawn()?;

  let pid = child.id();

  // Write PID file
  fs::write(pid_file, pid.to_string())?;

  println!("Server daemon started with PID {}", pid);
  println!("Use 'mds stop' to stop the server");

  Ok(())
}

/// Start the server as a background daemon (unsupported platforms)
#[cfg(not(any(unix, windows)))]
fn start_daemon(_host: String, _port: u16, _pid_file: &PathBuf) -> Result<()> {
  anyhow::bail!("Daemon mode is not supported on this platform. Use foreground mode instead.");
}
