use axum::{
  Router, ServiceExt,
  extract::{MatchedPath, Request},
  http::HeaderName,
  middleware::from_fn,
  routing::IntoMakeService,
};

use tower::{Layer, ServiceBuilder};
use tower_http::{
  normalize_path::{NormalizePath, NormalizePathLayer},
  request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
  trace::TraceLayer,
};

use crate::{
  middlewares::logs::log_app_errors,
  routes::{doc::doc_routes, git::git_routes, settings::settings_routes},
  state::app::AppState,
};

const REQUEST_ID_HEADER: &str = "x-request-id";

pub fn init_routes() -> IntoMakeService<NormalizePath<Router>> {
  let x_request_id = HeaderName::from_static(REQUEST_ID_HEADER);

  let middleware = ServiceBuilder::new()
    .layer(SetRequestIdLayer::new(
      x_request_id.clone(),
      MakeRequestUuid,
    ))
    .layer(TraceLayer::new_for_http().make_span_with(|req: &Request| {
      let request_id = req.headers().get(REQUEST_ID_HEADER);

      match request_id {
        Some(req_id) => tracing::info_span!("req_id", request_id = ?req_id),
        None => {
          tracing::error!("could not extract request_id");
          tracing::info_span!("req_id")
        }
      }
    }))
    .layer(
      TraceLayer::new_for_http()
        // Create our own span for the request and include the matched path. The matched
        // path is useful for figuring out which handler the request was routed to.
        .make_span_with(|req: &Request| {
          let method = req.method();
          let uri = req.uri();

          // axum automatically adds this extension.
          let matched_path = req
            .extensions()
            .get::<MatchedPath>()
            .map(|matched_path| matched_path.as_str());

          tracing::debug_span!("|", %method, %uri, matched_path)
        })
        // By default `TraceLayer` will log 5xx responses but we're doing our specific
        // logging of errors so disable that
        .on_failure(()),
    )
    // send headers from request to response headers
    .layer(PropagateRequestIdLayer::new(x_request_id))
    .layer(from_fn(log_app_errors));

  let app_state = AppState::default();

  let app = Router::new().nest(
    "/api",
    Router::new()
      .merge(settings_routes().with_state(app_state.clone()))
      .merge(doc_routes().with_state(app_state.clone()))
      .merge(git_routes().with_state(app_state.clone()))
      .layer(middleware),
  );

  let app = NormalizePathLayer::trim_trailing_slash().layer(app);

  // https://github.com/tokio-rs/axum/discussions/2377
  ServiceExt::<Request>::into_make_service(app)
  // <NormalizePath<Router> as ServiceExt<Request>>::into_make_service(app)
}
