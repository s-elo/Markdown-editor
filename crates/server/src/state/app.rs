use std::{path::PathBuf, sync::Arc};

use crate::services::{doc::DocService, git::GitService, settings::SettingsService};

#[derive(Clone)]
pub struct Services {
  pub settings_service: Arc<SettingsService>,
  pub doc_service: Arc<DocService>,
  pub git_service: Arc<GitService>,
}

impl Services {
  pub fn new(editor_settings_file: PathBuf) -> Self {
    let settings_service = Arc::new(SettingsService::new(editor_settings_file));
    let doc_service = Arc::new(DocService::new(settings_service.clone()));
    let git_service = Arc::new(GitService::new(
      settings_service.clone(),
      doc_service.clone(),
    ));
    Self {
      settings_service,
      doc_service,
      git_service,
    }
  }
}

#[derive(Clone)]
pub struct AppState {
  pub services: Services,
}

impl AppState {
  pub fn new(editor_settings_file: PathBuf) -> Self {
    Self {
      services: Services::new(editor_settings_file),
    }
  }
}
