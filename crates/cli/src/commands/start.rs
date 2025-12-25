use std::fs;
use std::path::PathBuf;

use anyhow::Result;
use server::{ServerConfig, default_log_dir, default_pid_file};

use crate::utils::{is_process_running, read_pid_file};

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

/// Start the server as a background daemon (Windows not supported)
#[cfg(not(unix))]
fn start_daemon(_host: String, _port: u16, _pid_file: &PathBuf) -> Result<()> {
  anyhow::bail!("Daemon mode is not supported on Windows. Use foreground mode instead.");
}
