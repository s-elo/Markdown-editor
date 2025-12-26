mod commands;
mod constants;
mod utils;

use anyhow::Result;
use clap::{Parser, Subcommand};

use commands::{cmd_logs_clear, cmd_logs_view, cmd_start, cmd_status, cmd_stop};
use constants::DEFAULT_PORT;

use crate::constants::DEFAULT_HOST;

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
  let cli = Cli::parse();

  match cli.command {
    None => {
      // No command: start as daemon with defaults
      cmd_start(true, DEFAULT_HOST.to_string(), DEFAULT_PORT)?;
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
