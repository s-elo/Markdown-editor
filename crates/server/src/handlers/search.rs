use axum::extract::{Query, State};
use serde::Deserialize;

use crate::{
  responses::app::{ApiRes, AppError},
  services::search::{FileContentMatches, FileNameMatch},
  state::app::AppState,
};

#[derive(Debug, Deserialize)]
pub struct SearchFilesQuery {
  pub q: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchContentQuery {
  pub q: String,
  pub case_sensitive: Option<bool>,
  pub include_files: Option<String>,
  pub exclude_files: Option<String>,
}

pub async fn search_files_handler(
  State(state): State<AppState>,
  Query(params): Query<SearchFilesQuery>,
) -> Result<ApiRes<Vec<FileNameMatch>>, AppError> {
  tracing::info!("[SearchHandler] searchFiles: {}", params.q);
  let results = state.services.search_service.search_file_names(&params.q)?;
  Ok(ApiRes::success(results))
}

pub async fn search_content_handler(
  State(state): State<AppState>,
  Query(params): Query<SearchContentQuery>,
) -> Result<ApiRes<Vec<FileContentMatches>>, AppError> {
  let case_insensitive = !params.case_sensitive.unwrap_or(false);
  let include_patterns: Vec<String> = params
    .include_files
    .as_deref()
    .map(|s| {
      s.split(',')
        .map(|p| p.trim().to_string())
        .filter(|p| !p.is_empty())
        .collect()
    })
    .unwrap_or_default();
  let exclude_patterns: Vec<String> = params
    .exclude_files
    .as_deref()
    .map(|s| {
      s.split(',')
        .map(|p| p.trim().to_string())
        .filter(|p| !p.is_empty())
        .collect()
    })
    .unwrap_or_default();

  tracing::info!(
    "[SearchHandler] searchContent: {} (case_insensitive: {})",
    params.q,
    case_insensitive,
  );
  let results = state.services.search_service.search_content(
    &params.q,
    case_insensitive,
    &include_patterns,
    &exclude_patterns,
  )?;
  Ok(ApiRes::success(results))
}
