mod commands;
mod constants;
mod utils;
#[cfg(target_os = "windows")]
mod windows_service;

use anyhow::Result;
use clap::{Parser, Subcommand};

use commands::{
  cmd_install, cmd_location, cmd_logs_clear, cmd_logs_view, cmd_start, cmd_status, cmd_stop,
  cmd_uninstall,
};
use constants::DEFAULT_PORT;

use crate::constants::DEFAULT_HOST;

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
    use crate::windows_service::ffi_service_main;
    use windows_service::service_dispatcher;

    // If dispatched as service, run service_main
    if let Err(_) = service_dispatcher::start("MarkdownEditorServer", ffi_service_main) {
      // Not running as service, proceed with CLI
    }
  }

  let cli = Cli::parse();

  // Handle location flag first
  if cli.location {
    cmd_location()?;
    return Ok(());
  }

  match cli.command {
    None => {
      // Install anyway if exists, just overwrite
      cmd_install()?;

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
