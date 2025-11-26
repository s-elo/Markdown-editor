use axum::extract::{Query, State};

use crate::{
  responses::app::{ApiRes, AppError, AppJson},
  services::doc::{
    CopyCutDocRequest, CreateDocRequest, DeleteDocRequest, GetArticleQuery, UpdateArticleRequest,
    UpdateDocNameRequest,
  },
  state::app::AppState,
};

pub async fn get_docs_handler(
  State(state): State<AppState>,
) -> Result<ApiRes<Vec<crate::services::doc::Doc>>, AppError> {
  tracing::info!("[DocHandler] getDocs.");
  let docs = state.services.doc_service.get_docs(false)?;
  Ok(ApiRes::success(docs))
}

pub async fn get_normalized_docs_handler(
  State(state): State<AppState>,
) -> Result<ApiRes<crate::services::doc::NormalizedDocMap>, AppError> {
  tracing::info!("[DocHandler] getNormalizedDocs.");
  let normalized_docs = state.services.doc_service.get_normalized_docs();
  Ok(ApiRes::success(normalized_docs))
}

pub async fn get_article_handler(
  State(state): State<AppState>,
  Query(params): Query<GetArticleQuery>,
) -> Result<ApiRes<Option<crate::services::doc::Article>>, AppError> {
  tracing::info!("[DocHandler] getArticle: {}", params.file_path);
  let article = state.services.doc_service.get_article(&params.file_path)?;
  Ok(ApiRes::success(article))
}

pub async fn create_doc_handler(
  State(state): State<AppState>,
  AppJson(request): AppJson<CreateDocRequest>,
) -> Result<ApiRes<crate::services::doc::Doc>, AppError> {
  tracing::info!(
    "[DocHandler] create {}: {}",
    if request.is_file { "article" } else { "folder" },
    request.file_path
  );
  let doc = state
    .services
    .doc_service
    .create_doc(&request.file_path, request.is_file)?;
  Ok(ApiRes::success(doc))
}

pub async fn update_article_handler(
  State(state): State<AppState>,
  AppJson(request): AppJson<UpdateArticleRequest>,
) -> Result<ApiRes<()>, AppError> {
  tracing::info!("[DocHandler] updateArticle: {}", request.file_path);
  state
    .services
    .doc_service
    .update_article(&request.file_path, &request.content)?;
  Ok(ApiRes::success(()))
}

pub async fn update_doc_name_handler(
  State(state): State<AppState>,
  AppJson(request): AppJson<UpdateDocNameRequest>,
) -> Result<ApiRes<()>, AppError> {
  tracing::info!(
    "[DocHandler] update {} name: {}",
    if request.is_file { "article" } else { "folder" },
    request.file_path
  );
  state
    .services
    .doc_service
    .modify_name(&request.file_path, &request.name, request.is_file)?;
  Ok(ApiRes::success(()))
}

pub async fn copy_cut_doc_handler(
  State(state): State<AppState>,
  AppJson(requests): AppJson<Vec<CopyCutDocRequest>>,
) -> Result<ApiRes<()>, AppError> {
  for request in requests {
    tracing::info!(
      "[DocHandler] {} {}: {} -> {}",
      if request.is_copy { "copy" } else { "cut" },
      if request.is_file { "article" } else { "folder" },
      request.copy_cut_path,
      request.paste_path
    );
    state.services.doc_service.copy_cut_doc(
      &request.copy_cut_path,
      &request.paste_path,
      request.is_copy,
      request.is_file,
    )?;
  }
  Ok(ApiRes::success(()))
}

pub async fn delete_doc_handler(
  State(state): State<AppState>,
  AppJson(requests): AppJson<Vec<DeleteDocRequest>>,
) -> Result<ApiRes<()>, AppError> {
  for request in requests {
    tracing::info!(
      "[DocHandler] delete {}: {}",
      if request.is_file { "article" } else { "folder" },
      request.file_path
    );
    state
      .services
      .doc_service
      .delete_doc(&request.file_path, request.is_file)?;
  }
  Ok(ApiRes::success(()))
}

pub async fn refresh_docs_handler(State(state): State<AppState>) -> Result<ApiRes<()>, AppError> {
  tracing::info!("[DocHandler] refresh docs.");
  state.services.doc_service.refresh_doc()?;
  Ok(ApiRes::success(()))
}
