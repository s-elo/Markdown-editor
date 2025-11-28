use axum::{extract::Request, middleware::Next, response::Response};
use std::sync::Arc;

use crate::responses::app::AppError;

// Our middleware is responsible for logging error details internally
pub async fn log_app_errors(request: Request, next: Next) -> Response {
  let response = next.run(request).await;
  // If the response contains an AppError Extension, log it.
  if let Some(err) = response.extensions().get::<Arc<AppError>>() {
    tracing::error!(?err, "an unexpected error occurred inside a handler");
  }
  response
}
