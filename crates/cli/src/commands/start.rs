use std::fs;
use std::path::PathBuf;

use anyhow::Result;
use server::ServerConfig;

use crate::{
  constants::{default_editor_settings_file, default_log_dir, default_pid_file},
  utils::{is_process_running, read_pid_file},
};

/// Resolve the bundled client directory relative to the current executable.
/// - macOS .app bundle: `{exe_dir}/../Resources/client/`
/// - Windows / general: `{exe_dir}/client/`
fn resolve_client_dir() -> Option<PathBuf> {
  let exe_path = std::env::current_exe().ok()?;
  let exe_dir = exe_path.parent()?;

  // macOS .app bundle: binary is at Contents/MacOS/mds, client at Contents/Resources/client
  let macos_client = exe_dir.join("../Resources/client");
  if macos_client.is_dir() {
    return Some(macos_client.canonicalize().unwrap_or(macos_client));
  }

  // General case: client/ alongside the binary
  let sibling_client = exe_dir.join("client");
  if sibling_client.is_dir() {
    return Some(sibling_client.canonicalize().unwrap_or(sibling_client));
  }

  None
}

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

  let client_dir = resolve_client_dir();
  if let Some(ref dir) = client_dir {
    println!("Serving client from {}", dir.display());
  }

  let config = ServerConfig {
    host,
    port,
    log_dir: default_log_dir(),
    log_to_terminal: true,
    editor_settings_file: default_editor_settings_file(),
    client_dir,
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

  match daemonize.start() {
    Ok(_) => {
      let client_dir = resolve_client_dir();

      let config = ServerConfig {
        host,
        port,
        log_dir: default_log_dir(),
        log_to_terminal: false,
        editor_settings_file: default_editor_settings_file(),
        client_dir,
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
  use crate::utils::{get_and_write_service_pid, get_real_executable_path, system_commands};

  println!("Starting server service on {}:{}...", host, port);

  let service_exists =
    system_commands::query_windows_service("MarkdownEditorServer").unwrap_or(false);

  let exe_path = get_real_executable_path()?;
  if service_exists {
    use crate::utils::system_commands::{stop_windows_service, update_bin_path_windows_service};

    println!("Service already registered, update bin path.");
    update_bin_path_windows_service("MarkdownEditorServer", &exe_path.to_string_lossy())?;
    println!("Restarting service to apply changes...");
    stop_windows_service("MarkdownEditorServer")?;
  } else {
    let created = system_commands::create_windows_service(
      "MarkdownEditorServer",
      &exe_path.to_string_lossy(),
      "Markdown Editor Server",
      "demand",
    )?;

    if !created {
      anyhow::bail!("Failed to create service");
    }
    println!("Service registered.");
  }

  let status = system_commands::start_windows_service("MarkdownEditorServer")?;

  if status.success() {
    println!("Server service started.");
    get_and_write_service_pid(pid_file)?;
  } else {
    if status.code() == Some(1056) {
      println!("Server service is already running.");
      get_and_write_service_pid(pid_file)?;
    } else {
      anyhow::bail!(
        "Failed to start service (exit code: {})",
        status.code().unwrap_or(-1)
      );
    }
  }

  Ok(())
}

/// Start the server as a background daemon (unsupported platforms)
#[cfg(not(any(unix, windows)))]
fn start_daemon(_host: String, _port: u16, _pid_file: &PathBuf) -> Result<()> {
  anyhow::bail!("Daemon mode is not supported on this platform. Use foreground mode instead.");
}
