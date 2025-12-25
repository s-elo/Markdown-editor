use std::sync::Arc;

use axum::{
  extract::{FromRequest, rejection::JsonRejection},
  http::StatusCode,
  response::{IntoResponse, Response},
};
use serde::Serialize;

// Create our own JSON extractor by wrapping `axum::Json`. This makes it easy to override the
// rejection and provide our own which formats errors to match our application.
//
// `axum::Json` responds with plain text if the input is invalid.
#[derive(FromRequest)]
#[from_request(via(axum::Json), rejection(AppError))]
pub struct AppJson<T>(pub T);

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct ApiRes<T> {
  data: Option<T>,
  code: u8,
  message: Option<T>,
}

impl<T> ApiRes<T> {
  pub fn success(data: T) -> Self {
    Self {
      data: Some(data),
      code: 0,
      message: None,
    }
  }

  pub fn error(message: T) -> Self {
    Self {
      data: None,
      code: 0,
      message: Some(message),
    }
  }
}

impl<T> IntoResponse for ApiRes<T>
where
  axum::Json<ApiRes<T>>: IntoResponse,
{
  fn into_response(self) -> Response {
    // wrap code feild
    axum::Json(self).into_response()
  }
}

// The kinds of errors we can hit in our application.
#[derive(Debug)]
pub enum AppError {
  // The request body contained invalid JSON
  JsonRejection(JsonRejection),
  Unknown(anyhow::Error),
}

// Tell axum how `AppError` should be converted into a response.
impl IntoResponse for AppError {
  fn into_response(self) -> Response {
    let (status, message, err) = match &self {
      AppError::JsonRejection(rejection) => {
        // This error is caused by bad user input so don't log it
        (rejection.status(), rejection.body_text(), None)
      }
      AppError::Unknown(err) => (
        StatusCode::INTERNAL_SERVER_ERROR,
        err.to_string(),
        Some(self),
      ),
    };

    let mut response = (status, ApiRes::error(message)).into_response();
    if let Some(err) = err {
      // Insert our error into the response, our logging middleware will use this.
      // By wrapping the error in an Arc we can use it as an Extension regardless of any inner types not deriving Clone.
      response.extensions_mut().insert(Arc::new(err));
    }

    response
  }
}

impl From<JsonRejection> for AppError {
  fn from(rejection: JsonRejection) -> Self {
    Self::JsonRejection(rejection)
  }
}

// This enables using `?` on functions that return `Result<_, anyhow::Error>` to turn them into
// `Result<_, AppError>`. That way you don't need to do that manually.
// see the get_all_users_handler and get_all_users service
impl From<anyhow::Error> for AppError {
  fn from(error: anyhow::Error) -> Self {
    Self::Unknown(error)
  }
}
