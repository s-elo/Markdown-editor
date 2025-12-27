mod commands;
mod constants;
mod utils;

use anyhow::Result;
use clap::{Parser, Subcommand};

use commands::{
  cmd_install, cmd_logs_clear, cmd_logs_view, cmd_start, cmd_status, cmd_stop, cmd_uninstall,
  is_installed,
};
use constants::DEFAULT_PORT;

use crate::constants::DEFAULT_HOST;

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

  // Run the server
  let config = server::ServerConfig {
    host: DEFAULT_HOST.to_string(),
    port: DEFAULT_PORT,
    log_dir: crate::constants::default_log_dir(),
    log_to_terminal: false,
    editor_settings_file: crate::constants::default_editor_settings_file(),
  };

  let rt = tokio::runtime::Runtime::new().unwrap();
  let _server_future = rt.spawn(async move {
    server::run_server(config).await.unwrap();
  });

  // Wait for shutdown signal
  let _ = shutdown_rx.recv();

  // Stop the server
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

  /// Install the server (copy binary, add to PATH, register autostart)
  Install,

  /// Uninstall the server (remove binary, PATH entry, and autostart)
  Uninstall,

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

fn main() -> Result<()> {
  // On Windows, check if running as a service
  #[cfg(target_os = "windows")]
  {
    use windows_service::service_dispatcher;

    // If dispatched as service, run service_main
    if let Err(_) = service_dispatcher::start("MarkdownEditorServer", ffi_service_main) {
      // Not running as service, proceed with CLI
    }
  }

  let cli = Cli::parse();

  match cli.command {
    None => {
      // No command: smart first-run detection
      // If not installed, install first (copy binary, add to PATH, register autostart)
      // Then start as daemon
      if !is_installed() {
        cmd_install()?;
      } else {
        cmd_start(true, DEFAULT_HOST.to_string(), DEFAULT_PORT)?;
      }

      println!("Run 'mds -h' for more information.");
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
    Some(Commands::Install) => {
      cmd_install()?;
    }
    Some(Commands::Uninstall) => {
      cmd_uninstall()?;
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
