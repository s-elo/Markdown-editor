use axum::extract::State;

use crate::{
  responses::app::{ApiRes, AppError, AppJson},
  services::git::{Change, GitStatus},
  state::app::AppState,
};

#[derive(serde::Deserialize)]
pub struct AddRequest {
  #[serde(rename = "changePaths")]
  pub change_paths: Vec<String>,
}

#[derive(serde::Deserialize)]
pub struct CommitRequest {
  pub title: String,
  pub body: String,
}

#[derive(serde::Deserialize)]
pub struct RestoreRequest {
  pub staged: bool,
  pub changes: Vec<Change>,
}

pub async fn get_status_handler(
  State(state): State<AppState>,
) -> Result<ApiRes<GitStatus>, AppError> {
  tracing::info!("[GitHandler] getStatus");

  if !state.services.git_service.is_repo() {
    tracing::info!("[GitHandler] no repo");
    return Ok(ApiRes::success(GitStatus {
      workspace: Vec::new(),
      staged: Vec::new(),
      changes: false,
      no_git: true,
    }));
  }

  let status = state.services.git_service.get_status()?;
  Ok(ApiRes::success(status))
}

pub async fn add_handler(
  State(state): State<AppState>,
  AppJson(request): AppJson<AddRequest>,
) -> Result<ApiRes<()>, AppError> {
  tracing::info!("[GitHandler] add: {:?}", request.change_paths);
  state.services.git_service.add(request.change_paths)?;
  Ok(ApiRes::success(()))
}

pub async fn commit_handler(
  State(state): State<AppState>,
  AppJson(request): AppJson<CommitRequest>,
) -> Result<ApiRes<()>, AppError> {
  tracing::info!("[GitHandler] commit: {} - {}", request.title, request.body);
  // state.services.git_service.commit(request.title, request.body)?;
  let message = if request.body.is_empty() {
    request.title
  } else {
    format!("{}\n\n{}", request.title, request.body)
  };
  state.services.git_service.exec_commit(message)?;
  Ok(ApiRes::success(()))
}

pub async fn push_handler(State(state): State<AppState>) -> Result<ApiRes<()>, AppError> {
  tracing::info!("[GitHandler] push");
  state.services.git_service.exec_push()?;
  Ok(ApiRes::success(()))
}

pub async fn pull_handler(State(state): State<AppState>) -> Result<ApiRes<()>, AppError> {
  tracing::info!("[GitHandler] pull");
  state.services.git_service.pull()?;
  Ok(ApiRes::success(()))
}

pub async fn restore_handler(
  State(state): State<AppState>,
  AppJson(request): AppJson<RestoreRequest>,
) -> Result<ApiRes<()>, AppError> {
  tracing::info!(
    "[GitHandler] restore: staged={}, changes={:?}",
    request.staged,
    request.changes
  );
  state
    .services
    .git_service
    .restore(request.staged, request.changes)?;
  Ok(ApiRes::success(()))
}
