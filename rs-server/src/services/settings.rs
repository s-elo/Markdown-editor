use std::{
  fs,
  path::PathBuf,
  sync::{Arc, Mutex},
};

use serde::{Deserialize, Serialize};
use struct_patch::Patch;

use crate::utils::project_root;

#[derive(Patch, Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
#[patch(attribute(derive(Deserialize, Debug)))]
// this means rename the incoming request body to camel case
// from str to json will be from camel case to orignal keys
#[patch(attribute(serde(rename_all = "camelCase")))]
pub struct Settings {
  pub doc_root_path: PathBuf,
  pub ignore_dirs: Vec<String>,
}

const EDITOR_SETTINGS_FILE_NAME: &str = "editor-settings.json";

impl Default for Settings {
  fn default() -> Self {
    let editor_setting_path = project_root(&[EDITOR_SETTINGS_FILE_NAME]);

    let cur_settins = if editor_setting_path.exists() {
      let file_content = fs::read_to_string(editor_setting_path).unwrap();
      let settings: Settings = serde_json::from_str(&file_content).unwrap();
      settings
    } else {
      let default_settings = Self {
        doc_root_path: project_root(&["fallback-docs"]),
        ignore_dirs: vec![
          String::from(".git"),
          String::from("imgs"),
          String::from("node_modules"),
          String::from("dist"),
        ],
      };

      fs::write(
        editor_setting_path,
        serde_json::to_string(&default_settings).unwrap(),
      )
      .unwrap();

      default_settings
    };

    cur_settins
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
    let doc_path = &new_settings.doc_root_path;
    match doc_path {
      Some(path) => {
        if !path.exists() {
          tracing::error!("doc_root_path does not exist: {:?}", path);
          return self.get_settings();
        }
      }
      _ => {}
    }

    self.settings.lock().unwrap().apply(new_settings);

    fs::write(
      project_root(&[EDITOR_SETTINGS_FILE_NAME]),
      serde_json::to_string_pretty(&self.settings.lock().unwrap().clone()).unwrap(),
    )
    .unwrap();

    let updated_settings = self.settings.lock().unwrap().clone();
    tracing::info!("settings updated: {:?}", updated_settings);

    updated_settings
  }
}
