use axum::extract::State;

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
  let updated_settings = state
    .services
    .settings_service
    .update_settings(new_settings);

  state.services.doc_service.sync_settings(&updated_settings);

  Ok(ApiRes::success(updated_settings))
}
