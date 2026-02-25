use axum::{Router, routing};

use crate::{
  handlers::img::{get_image_handler, upload_image_handler},
  state::app::AppState,
};

pub fn img_routes() -> Router<AppState> {
  Router::new().nest(
    "/imgs",
    Router::new()
      .route("/upload", routing::post(upload_image_handler))
      .route("/{*path}", routing::get(get_image_handler)),
  )
}
