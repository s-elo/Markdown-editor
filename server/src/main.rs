mod handlers;
mod middlewares;
mod responses;
mod routes;
mod services;
mod state;
mod utils;

use routes::root::init_routes;
use tracing_appender::{non_blocking, rolling};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
  // Create logs directory if it doesn't exist
  std::fs::create_dir_all("logs").unwrap_or_else(|e| {
    eprintln!("Warning: Failed to create logs directory: {}", e);
  });

  // Create a file appender that rotates daily
  let file_appender = rolling::daily("logs", "server.log");
  let (non_blocking_appender, _guard) = non_blocking(file_appender);

  tracing_subscriber::registry()
    .with(
      tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| format!("{}=debug,tower_http=debug", env!("CARGO_CRATE_NAME")).into()),
    )
    // Terminal output
    .with(tracing_subscriber::fmt::layer())
    // File output - NonBlocking implements MakeWriter directly
    .with(
      tracing_subscriber::fmt::layer()
        .with_writer(non_blocking_appender)
        .with_ansi(false), // Disable ANSI colors in file logs
    )
    .init();

  // Keep the guard in scope for the lifetime of the program to ensure logs are flushed
  // The guard must not be dropped until the program exits
  let _file_guard = _guard;

  let app = init_routes();

  let listener = tokio::net::TcpListener::bind("127.0.0.1:3024")
    .await
    .unwrap();
  tracing::debug!("listening on {}", listener.local_addr().unwrap());
  axum::serve(listener, app).await.unwrap();
}
