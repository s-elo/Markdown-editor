use axum::{Router, routing};

use crate::{
  handlers::img::{
    delete_image_handler, get_image_handler, list_images_handler, upload_image_handler,
  },
  state::app::AppState,
};

pub fn img_routes() -> Router<AppState> {
  Router::new().nest(
    "/imgs",
    Router::new()
      .route("/list", routing::get(list_images_handler))
      .route("/upload", routing::post(upload_image_handler))
      .route("/delete", routing::delete(delete_image_handler))
      .route("/{*path}", routing::get(get_image_handler)),
  )
}
