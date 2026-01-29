use axum::extract::{Query, State};

use crate::{
  responses::app::{ApiRes, AppError, AppJson},
  services::doc::{
    CopyCutDocRequest, CreateDocRequest, DeleteDocRequest, GetArticleQuery, UpdateArticleRequest,
    UpdateDocNameRequest, structs::GetDocSubTreeQueryPatch,
  },
  state::app::AppState,
  utils::path_encoding::encode_path_string,
};

pub async fn get_sub_doc_items_handler(
  State(state): State<AppState>,
  Query(params): Query<GetDocSubTreeQueryPatch>,
) -> Result<ApiRes<Vec<crate::services::doc::DocItem>>, AppError> {
  let folder_doc_path = params.folder_doc_path.unwrap_or_default();
  tracing::info!("[DocHandler] getDocSubTree. {}.", folder_doc_path);
  let doc_items = state
    .services
    .doc_service
    .get_sub_doc_items(&folder_doc_path)?;
  Ok(ApiRes::success(doc_items))
}

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
  // Normalize the path to ensure it matches the format used in nor_docs
  let normalized_path = encode_path_string(&params.file_path);
  tracing::info!(
    "[DocHandler] getArticle: {} (normalized: {})",
    params.file_path,
    normalized_path
  );
  let article = state.services.doc_service.get_article(&normalized_path)?;
  Ok(ApiRes::success(article))
}

pub async fn create_doc_handler(
  State(state): State<AppState>,
  AppJson(request): AppJson<CreateDocRequest>,
) -> Result<ApiRes<crate::services::doc::Doc>, AppError> {
  // Normalize the path to ensure it matches the format used in nor_docs
  let normalized_path = encode_path_string(&request.file_path);
  tracing::info!(
    "[DocHandler] create {}: {} (normalized: {})",
    if request.is_file { "article" } else { "folder" },
    request.file_path,
    normalized_path
  );
  let doc = state
    .services
    .doc_service
    .create_doc(&normalized_path, request.is_file)?;
  Ok(ApiRes::success(doc))
}

pub async fn update_article_handler(
  State(state): State<AppState>,
  AppJson(request): AppJson<UpdateArticleRequest>,
) -> Result<ApiRes<()>, AppError> {
  // Normalize the path to ensure it matches the format used in nor_docs
  let normalized_path = encode_path_string(&request.file_path);
  tracing::info!(
    "[DocHandler] updateArticle: {} (normalized: {})",
    request.file_path,
    normalized_path
  );
  state
    .services
    .doc_service
    .update_article(&normalized_path, &request.content)?;
  Ok(ApiRes::success(()))
}

pub async fn update_doc_name_handler(
  State(state): State<AppState>,
  AppJson(request): AppJson<UpdateDocNameRequest>,
) -> Result<ApiRes<()>, AppError> {
  // Normalize the path to ensure it matches the format used in nor_docs
  let normalized_path = encode_path_string(&request.file_path);
  tracing::info!(
    "[DocHandler] update {} name: {} (normalized: {})",
    if request.is_file { "article" } else { "folder" },
    request.file_path,
    normalized_path
  );
  state
    .services
    .doc_service
    .modify_name(&normalized_path, &request.name, request.is_file)?;
  Ok(ApiRes::success(()))
}

pub async fn copy_cut_doc_handler(
  State(state): State<AppState>,
  AppJson(requests): AppJson<Vec<CopyCutDocRequest>>,
) -> Result<ApiRes<()>, AppError> {
  for request in requests {
    // Normalize the paths to ensure they match the format used in nor_docs
    let normalized_copy_cut_path = encode_path_string(&request.copy_cut_path);
    let normalized_paste_path = encode_path_string(&request.paste_path);
    tracing::info!(
      "[DocHandler] {} {}: {} -> {} (normalized: {} -> {})",
      if request.is_copy { "copy" } else { "cut" },
      if request.is_file { "article" } else { "folder" },
      request.copy_cut_path,
      request.paste_path,
      normalized_copy_cut_path,
      normalized_paste_path
    );
    state.services.doc_service.copy_cut_doc(
      &normalized_copy_cut_path,
      &normalized_paste_path,
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
    // Normalize the path to ensure it matches the format used in nor_docs
    let normalized_path = encode_path_string(&request.file_path);
    tracing::info!(
      "[DocHandler] delete {}: {} (normalized: {})",
      if request.is_file { "article" } else { "folder" },
      request.file_path,
      normalized_path
    );
    state
      .services
      .doc_service
      .delete_doc(&normalized_path, request.is_file)?;
  }
  Ok(ApiRes::success(()))
}

pub async fn refresh_docs_handler(State(state): State<AppState>) -> Result<ApiRes<()>, AppError> {
  tracing::info!("[DocHandler] refresh docs.");
  state.services.doc_service.refresh_doc()?;
  Ok(ApiRes::success(()))
}
