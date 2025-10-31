use axum::extract::State;
use serde::Deserialize;

use crate::{
  responses::app::{ApiRes, AppError, AppJson},
  services::settings::{Settings, SettingsPatch},
  state::app::AppState,
};

pub async fn get_settings_handler(
  State(state): State<AppState>,
) -> Result<ApiRes<Settings>, AppError> {
  Ok(ApiRes::success(
    state.services.settings_service.get_settings(),
  ))
}

pub async fn update_settings_handler(
  State(state): State<AppState>,
  AppJson(new_settings): AppJson<SettingsPatch>,
) -> Result<ApiRes<Settings>, AppError> {
  Ok(ApiRes::success(
    state
      .services
      .settings_service
      .update_settings(new_settings),
  ))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestStruct {
  pub first_name: String,
}

pub async fn test_handler(
  AppJson(test_struct): AppJson<TestStruct>,
) -> Result<ApiRes<String>, AppError> {
  println!("{:?}", test_struct);
  Ok(ApiRes::success("test".to_string()))
}
