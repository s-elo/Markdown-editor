use crate::services::settings::SettingsService;

#[derive(Default, Clone)]
pub struct Services {
  pub settings_service: SettingsService,
}

#[derive(Default, Clone)]
pub struct AppState {
  pub services: Services,
}
