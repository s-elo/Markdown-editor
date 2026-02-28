use axum::{Router, routing};

use crate::{
  handlers::search::{search_content_handler, search_files_handler},
  state::app::AppState,
};

pub fn search_routes() -> Router<AppState> {
  Router::new().nest(
    "/search",
    Router::new()
      .route("/files", routing::get(search_files_handler))
      .route("/content", routing::get(search_content_handler)),
  )
}
