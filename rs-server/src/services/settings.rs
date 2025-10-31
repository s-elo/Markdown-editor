use std::{
  path::PathBuf,
  sync::{Arc, Mutex},
};

use serde::{Deserialize, Serialize};
use struct_patch::Patch;

use crate::utils::project_root;

#[derive(Patch, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
#[patch(attribute(derive(Deserialize, Debug)))]
// this means rename the incoming request body to camel case
// from str to json will be from camel case to orignal keys
#[patch(attribute(serde(rename_all = "camelCase")))]
pub struct Settings {
  pub doc_root_path: PathBuf,
  pub ignore_dirs: Vec<String>,
}

impl Default for Settings {
  fn default() -> Self {
    Self {
      doc_root_path: project_root(&["fallback-docs"]),
      ignore_dirs: vec![
        String::from(".git"),
        String::from("imgs"),
        String::from("node_modules"),
        String::from("dist"),
      ],
    }
  }
}

#[derive(Clone, Default)]
pub struct SettingsService {
  pub settings: Arc<Mutex<Settings>>,
}

impl SettingsService {
  pub fn get_settings(&self) -> Settings {
    tracing::info!("get_settings");
    self.settings.lock().unwrap().clone()
  }

  pub fn update_settings(self, new_settings: SettingsPatch) -> Settings {
    tracing::info!("update_settings: {:?}", new_settings);
    self.settings.lock().unwrap().apply(new_settings);
    self.get_settings()
  }
}
