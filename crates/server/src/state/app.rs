use std::{path::PathBuf, sync::Arc};

use crate::services::{
  doc::DocService, git::GitService, img::ImgService, search::SearchService,
  settings::SettingsService,
};

#[derive(Clone)]
pub struct Services {
  pub settings_service: Arc<SettingsService>,
  pub doc_service: Arc<DocService>,
  pub git_service: Arc<GitService>,
  pub img_service: Arc<ImgService>,
  pub search_service: Arc<SearchService>,
}

impl Services {
  pub fn new(editor_settings_file: PathBuf) -> Self {
    let settings_service = Arc::new(SettingsService::new(editor_settings_file));
    let doc_service = Arc::new(DocService::new(settings_service.clone()));
    let git_service = Arc::new(GitService::new(settings_service.clone()));
    let img_service = Arc::new(ImgService::new(settings_service.clone()));
    let search_service = Arc::new(SearchService::new(settings_service.clone()));
    Self {
      settings_service,
      doc_service,
      git_service,
      img_service,
      search_service,
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
