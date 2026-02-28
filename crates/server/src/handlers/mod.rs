use serde::{Deserialize, Serialize};

use crate::responses::app::{ApiRes, AppError};

pub mod doc;
pub mod git;
pub mod img;
pub mod search;
pub mod settings;

#[derive(Serialize, Deserialize)]
pub struct CheckServerRes {
  version: String,
}
pub async fn check_server_handler() -> Result<ApiRes<CheckServerRes>, AppError> {
  tracing::info!("[CheckServerHandler] checkServer.");
  let version = env!("CARGO_PKG_VERSION").to_string();
  Ok(ApiRes::success(CheckServerRes { version }))
}
