pub mod handlers;
pub mod middlewares;
pub mod responses;
pub mod routes;
pub mod services;
pub mod state;
pub mod utils;

use std::path::PathBuf;

pub use routes::root::init_routes;
use tracing_appender::{non_blocking, rolling};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// Server configuration
#[derive(Debug, Clone)]
pub struct ServerConfig {
  pub host: String,
  pub port: u16,
  pub log_dir: PathBuf,
  pub log_to_terminal: bool,
}

impl Default for ServerConfig {
  fn default() -> Self {
    Self {
      host: "127.0.0.1".to_string(),
      port: 3024,
      log_dir: PathBuf::from("logs"),
      log_to_terminal: true,
    }
  }
}

/// Initialize tracing/logging for the server
pub fn init_tracing(
  config: &ServerConfig,
) -> anyhow::Result<tracing_appender::non_blocking::WorkerGuard> {
  // Create logs directory if it doesn't exist
  std::fs::create_dir_all(&config.log_dir).unwrap_or_else(|e| {
    eprintln!("Warning: Failed to create logs directory: {}", e);
  });

  // Create a file appender that rotates daily
  let file_appender = rolling::daily(&config.log_dir, "server.log");
  let (non_blocking_appender, guard) = non_blocking(file_appender);

  let registry = tracing_subscriber::registry().with(
    tracing_subscriber::EnvFilter::try_from_default_env()
      .unwrap_or_else(|_| "server=debug,tower_http=debug".into()),
  );

  if config.log_to_terminal {
    registry
      // Terminal output
      .with(tracing_subscriber::fmt::layer())
      // File output
      .with(
        tracing_subscriber::fmt::layer()
          .with_writer(non_blocking_appender)
          .with_ansi(false),
      )
      .init();
  } else {
    registry
      // File output only (daemon mode)
      .with(
        tracing_subscriber::fmt::layer()
          .with_writer(non_blocking_appender)
          .with_ansi(false),
      )
      .init();
  }

  Ok(guard)
}

/// Run the server with the given configuration
pub async fn run_server(config: ServerConfig) -> anyhow::Result<()> {
  let _guard = init_tracing(&config)?;

  let app = init_routes();

  let addr = format!("{}:{}", config.host, config.port);
  let listener = tokio::net::TcpListener::bind(&addr).await?;
  tracing::info!("Server listening on {}", listener.local_addr()?);

  axum::serve(listener, app).await?;

  Ok(())
}

/// Get the default log directory path
pub fn default_log_dir() -> PathBuf {
  PathBuf::from("logs")
}

/// Get the default PID file path (relative to where the server runs)
pub fn default_pid_file() -> PathBuf {
  PathBuf::from("md-server.pid")
}
