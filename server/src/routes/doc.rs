use axum::{Router, routing};

use crate::{
  handlers::doc::{
    copy_cut_doc_handler, create_doc_handler, delete_doc_handler, get_article_handler,
    get_docs_handler, get_normalized_docs_handler, refresh_docs_handler, update_article_handler,
    update_doc_name_handler,
  },
  state::app::AppState,
};

pub fn doc_routes() -> Router<AppState> {
  Router::new().nest(
    "/docs",
    Router::new()
      .route("/", routing::get(get_docs_handler))
      .route("/nor-docs", routing::get(get_normalized_docs_handler))
      .route("/article", routing::get(get_article_handler))
      .route("/create", routing::post(create_doc_handler))
      .route("/update", routing::patch(update_article_handler))
      .route("/update-name", routing::patch(update_doc_name_handler))
      .route("/copy-cut", routing::patch(copy_cut_doc_handler))
      .route("/delete", routing::delete(delete_doc_handler))
      .route("/refresh", routing::post(refresh_docs_handler)),
  )
}
