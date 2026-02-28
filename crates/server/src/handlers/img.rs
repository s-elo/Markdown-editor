use axum::{
  body::Body,
  extract::{Multipart, Path, State},
  http::{HeaderValue, Response, StatusCode, header},
};

use serde::Deserialize;

use crate::{
  responses::app::{ApiRes, AppError, AppJson},
  services::img::ImgItem,
  state::app::AppState,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteImageRequest {
  pub file_name: String,
}

pub async fn list_images_handler(
  State(state): State<AppState>,
) -> Result<ApiRes<Vec<ImgItem>>, AppError> {
  tracing::info!("[ImgHandler] listing images");
  let images = state.services.img_service.list_images()?;
  Ok(ApiRes::success(images))
}

pub async fn delete_image_handler(
  State(state): State<AppState>,
  AppJson(body): AppJson<DeleteImageRequest>,
) -> Result<ApiRes<String>, AppError> {
  tracing::info!("[ImgHandler] deleting image: {}", body.file_name);
  state.services.img_service.delete_image(&body.file_name)?;
  Ok(ApiRes::success("deleted".to_string()))
}

pub async fn get_image_handler(
  State(state): State<AppState>,
  Path(img_path): Path<String>,
) -> Result<Response<Body>, AppError> {
  tracing::info!("[ImgHandler] get image: {}", img_path);

  let (bytes, mime) = state.services.img_service.get_image(&img_path)?;

  let response = Response::builder()
    .status(StatusCode::OK)
    .header(header::CONTENT_TYPE, HeaderValue::from_str(&mime).unwrap())
    .header(header::CACHE_CONTROL, "public, max-age=3600")
    .body(Body::from(bytes))
    .unwrap();

  Ok(response)
}

pub async fn upload_image_handler(
  State(state): State<AppState>,
  mut multipart: Multipart,
) -> Result<ApiRes<String>, AppError> {
  while let Some(field) = multipart
    .next_field()
    .await
    .map_err(|e| anyhow::anyhow!("Failed to read multipart field: {}", e))?
  {
    let file_name = field
      .file_name()
      .map(|s| s.to_string())
      .ok_or_else(|| anyhow::anyhow!("Missing file name"))?;

    let data = field
      .bytes()
      .await
      .map_err(|e| anyhow::anyhow!("Failed to read file data: {}", e))?;

    tracing::info!(
      "[ImgHandler] uploading image: {} ({} bytes)",
      file_name,
      data.len()
    );

    let url = state.services.img_service.upload_image(&file_name, &data)?;
    return Ok(ApiRes::success(url));
  }

  Err(anyhow::anyhow!("No file provided in upload").into())
}
