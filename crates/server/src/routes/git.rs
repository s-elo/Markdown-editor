use axum::{Router, routing};

use crate::{
  handlers::git::{
    add_handler, commit_handler, get_status_handler, pull_handler, push_handler, restore_handler,
  },
  state::app::AppState,
};

pub fn git_routes() -> Router<AppState> {
  Router::new().nest(
    "/git",
    Router::new()
      .route("/status", routing::get(get_status_handler))
      .route("/add", routing::post(add_handler))
      .route("/commit", routing::post(commit_handler))
      .route("/push", routing::post(push_handler))
      .route("/pull", routing::post(pull_handler))
      .route("/restore", routing::post(restore_handler)),
  )
}
