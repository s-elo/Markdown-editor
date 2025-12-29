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
  } else {
    anyhow::bail!(
      "Could not determine parent directory for PID file: {}",
      pid_file.display()
    );
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

/// Start the server as a Windows service
#[cfg(target_os = "windows")]
fn start_daemon(host: String, port: u16, pid_file: &PathBuf) -> Result<()> {
  use crate::utils::get_and_write_service_pid;
  use std::process::Command;

  println!("Starting server service on {}:{}...", host, port);

  // Check if service exists
  let query_status = Command::new("sc.exe")
    .args(["query", "MarkdownEditorServer"])
    .status();

  let service_exists = query_status.map(|s| s.success()).unwrap_or(false);

  if !service_exists {
    // Service not installed, create it
    println!("Service not installed, registering service...");
    let exe_path = std::env::current_exe()?;
    let create_status = Command::new("sc.exe")
      .args([
        "create",
        "MarkdownEditorServer",
        "binPath=",
        &format!("\"{}\"", exe_path.display()),
        "start=",
        "demand", // Manual start
        "DisplayName=",
        "Markdown Editor Server",
      ])
      .status();

    if !create_status.map(|s| s.success()).unwrap_or(false) {
      anyhow::bail!("Failed to create service");
    }
    println!("Service registered.");
  }

  // Start the Windows service
  let status = Command::new("sc.exe")
    .args(["start", "MarkdownEditorServer"])
    .status();

  match status {
    Ok(s) if s.success() => {
      println!("Server service started.");
      // Get the service PID and write to file
      get_and_write_service_pid(pid_file)?;
    }
    Ok(s) => {
      if s.code() == Some(1056) {
        println!("Server service is already running.");
        // Get the service PID and write to file
        get_and_write_service_pid(pid_file)?;
      } else {
        anyhow::bail!(
          "Failed to start service (exit code: {})",
          s.code().unwrap_or(-1)
        );
      }
    }
    Err(e) => {
      anyhow::bail!("Failed to start service: {}", e);
    }
  }

  Ok(())
}

/// Start the server as a background daemon (unsupported platforms)
#[cfg(not(any(unix, windows)))]
fn start_daemon(_host: String, _port: u16, _pid_file: &PathBuf) -> Result<()> {
  anyhow::bail!("Daemon mode is not supported on this platform. Use foreground mode instead.");
}
