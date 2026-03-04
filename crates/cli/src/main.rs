mod check_server;
mod commands;
mod constants;
mod utils;

use std::net::{TcpListener, TcpStream};

use anyhow::Result;
use clap::{Parser, Subcommand};

use commands::{
  add_to_path, cmd_location, cmd_logs_clear, cmd_logs_view, cmd_start, cmd_status, cmd_stop,
};
use constants::{DEFAULT_HOST, DEFAULT_PORT};

use crate::check_server::check_server;
use crate::constants::default_pid_file;
use crate::utils::{get_real_executable_path, is_process_running, read_pid_file};

#[cfg(target_os = "windows")]
use std::ffi::OsString;
#[cfg(target_os = "windows")]
use windows_service::define_windows_service;

#[cfg(target_os = "windows")]
define_windows_service!(ffi_service_main, my_service_main);

#[cfg(target_os = "windows")]
fn my_service_main(_arguments: Vec<OsString>) {
  use std::sync::mpsc;
  use std::time::Duration;
  use windows_service::service::{
    ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus, ServiceType,
  };
  use windows_service::service_control_handler::{self, ServiceControlHandlerResult};

  let (shutdown_tx, shutdown_rx) = mpsc::channel();

  let event_handler = move |control_event| -> ServiceControlHandlerResult {
    match control_event {
      ServiceControl::Stop => {
        let _ = shutdown_tx.send(());
        ServiceControlHandlerResult::NoError
      }
      _ => ServiceControlHandlerResult::NotImplemented,
    }
  };

  let status_handle =
    service_control_handler::register("MarkdownEditorServer", event_handler).unwrap();

  status_handle
    .set_service_status(ServiceStatus {
      service_type: ServiceType::OWN_PROCESS,
      current_state: ServiceState::Running,
      controls_accepted: ServiceControlAccept::STOP,
      exit_code: ServiceExitCode::Win32(0),
      checkpoint: 0,
      wait_hint: Duration::default(),
      process_id: None,
    })
    .unwrap();

  let log_dir = crate::constants::default_log_dir();
  let editor_settings_file = crate::constants::default_editor_settings_file();

  let config = server::ServerConfig {
    host: DEFAULT_HOST.to_string(),
    port: DEFAULT_PORT,
    log_dir,
    log_to_terminal: false,
    editor_settings_file,
    client_dir: None,
  };

  let rt = tokio::runtime::Runtime::new().unwrap();
  let _server_future = rt.spawn(async move {
    server::run_server(config).await.unwrap();
  });

  let _ = shutdown_rx.recv();

  rt.shutdown_timeout(Duration::from_secs(5));

  status_handle
    .set_service_status(ServiceStatus {
      service_type: ServiceType::OWN_PROCESS,
      current_state: ServiceState::Stopped,
      controls_accepted: ServiceControlAccept::empty(),
      exit_code: ServiceExitCode::Win32(0),
      checkpoint: 0,
      wait_hint: Duration::default(),
      process_id: None,
    })
    .unwrap();
}

#[derive(Parser)]
#[command(name = "md-server", version, about = "Markdown Editor Server CLI")]
struct Cli {
  /// Show the current executable location and app data location
  #[arg(long, short = 'l')]
  location: bool,

  #[command(subcommand)]
  command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
  /// Start the server
  Start {
    /// Run as a background daemon
    #[arg(long, short)]
    daemon: bool,

    /// Host to bind to
    #[arg(long, default_value = DEFAULT_HOST)]
    host: String,

    /// Port to listen on
    #[arg(long, default_value_t = DEFAULT_PORT)]
    port: u16,
  },

  /// Stop a running daemon
  Stop,

  /// Check if the server is running
  Status,

  /// View or manage server logs
  Logs {
    #[command(subcommand)]
    cmd: Option<LogsCmd>,

    /// Show the last N lines
    #[arg(long, short, default_value = "50")]
    tail: usize,

    /// Follow the log output (like tail -f)
    #[arg(long, short)]
    follow: bool,
  },
}

#[derive(Subcommand)]
enum LogsCmd {
  /// Clear all log files
  Clear,
}

/// Find an available port starting from the preferred port.
fn find_available_port(host: &str, preferred: u16) -> Result<u16> {
  if TcpListener::bind((host, preferred)).is_ok() {
    return Ok(preferred);
  }
  for port in (preferred + 1)..=(preferred + 100) {
    if TcpListener::bind((host, port)).is_ok() {
      return Ok(port);
    }
  }
  anyhow::bail!(
    "No available port found in range {}-{}",
    preferred,
    preferred + 100
  );
}

fn main() -> Result<()> {
  #[cfg(target_os = "windows")]
  {
    use windows_service::service_dispatcher;

    if let Err(_) = service_dispatcher::start("MarkdownEditorServer", ffi_service_main) {
      // Not running as service, proceed with CLI
    }
  }

  let cli = Cli::parse();

  if cli.location {
    cmd_location()?;
    return Ok(());
  }

  match cli.command {
    // Quick launch: add to PATH, check if running, start daemon, open browser
    None => {
      println!("Run `mds -h` for more information.");

      let _ = add_to_path(); // best-effort, don't fail if PATH update fails

      let is_matched_server = check_server()?;
      if is_matched_server {
        let pid_file = default_pid_file();
        if let Some(pid) = read_pid_file(&pid_file) {
          if is_process_running(pid) {
            println!("Server is already running with PID {}", pid);
            let url = format!("http://{}:{}/", DEFAULT_HOST, DEFAULT_PORT);
            if open::that(&url).is_err() {
              println!("Open {} in your browser", url);
            }
            return Ok(());
          }
        }
      }

      let port = find_available_port(DEFAULT_HOST, DEFAULT_PORT)?;

      // Spawn daemon as a separate process so this process survives to open the browser.
      // Calling cmd_start(daemon=true) directly would daemonize *this* process (the parent
      // is killed by the fork), so the browser-opening code below would never execute.
      let exe = get_real_executable_path()?;
      let _child = std::process::Command::new(&exe)
        .args([
          "start",
          "--daemon",
          "--host",
          DEFAULT_HOST,
          "--port",
          &port.to_string(),
        ])
        .spawn()
        .map_err(|e| anyhow::anyhow!("Failed to spawn daemon process: {}", e))?;

      // Poll until the server is reachable (up to ~3 seconds)
      let url = format!("http://{}:{}/", DEFAULT_HOST, port);
      let mut ready = false;
      for _ in 0..6 {
        std::thread::sleep(std::time::Duration::from_millis(500));
        if TcpStream::connect((DEFAULT_HOST, port)).is_ok() {
          ready = true;
          break;
        }
      }

      if !ready {
        println!("Warning: server may not be ready yet");
      }

      if open::that(&url).is_err() {
        println!("Open {} in your browser", url);
      }
    }
    Some(Commands::Start { daemon, host, port }) => {
      cmd_start(daemon, host, port)?;
    }
    Some(Commands::Stop) => {
      cmd_stop()?;
    }
    Some(Commands::Status) => {
      cmd_status()?;
    }
    Some(Commands::Logs { cmd, tail, follow }) => match cmd {
      Some(LogsCmd::Clear) => {
        cmd_logs_clear()?;
      }
      None => {
        cmd_logs_view(tail, follow)?;
      }
    },
  }

  Ok(())
}
