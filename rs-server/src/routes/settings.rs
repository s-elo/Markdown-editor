use axum::{Router, routing::get};

use crate::{
  handlers::settings::{get_settings_handler, test_handler, update_settings_handler},
  state::app::AppState,
};

pub fn settings_routes() -> Router<AppState> {
  Router::new().nest(
    "/settings",
    Router::new()
      .route(
        "/",
        get(get_settings_handler).patch(update_settings_handler),
      )
      .route("/test", get(test_handler)),
  )
}
