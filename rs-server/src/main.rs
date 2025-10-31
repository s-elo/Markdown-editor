mod handlers;
mod middlewares;
mod responses;
mod routes;
mod services;
mod state;
mod utils;

use routes::root::init_routes;

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
  tracing_subscriber::registry()
    .with(
      tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| format!("{}=debug,tower_http=debug", env!("CARGO_CRATE_NAME")).into()),
    )
    .with(tracing_subscriber::fmt::layer())
    .init();

  let app = init_routes();

  let listener = tokio::net::TcpListener::bind("127.0.0.1:3024")
    .await
    .unwrap();
  tracing::debug!("listening on {}", listener.local_addr().unwrap());
  axum::serve(listener, app).await.unwrap();
}
