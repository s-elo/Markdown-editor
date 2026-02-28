use std::{
  fs,
  path::PathBuf,
  sync::{Arc, Mutex},
};

use serde::{Deserialize, Serialize};
use struct_patch::Patch;

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

impl Settings {
  pub fn load_from_file(editor_settings_file: &PathBuf) -> Self {
    if editor_settings_file.exists() {
      let file_content = fs::read_to_string(editor_settings_file).unwrap();
      let settings: Settings = serde_json::from_str(&file_content).unwrap();
      settings
    } else {
      let default_settings = Self {
        doc_root_path: PathBuf::from(""),
        ignore_dirs: vec![
          String::from("imgs"),
          String::from("node_modules"),
          String::from("dist"),
        ],
      };

      // Ensure parent directory exists
      if let Some(parent) = editor_settings_file.parent() {
        fs::create_dir_all(parent).unwrap_or_else(|e| {
          tracing::error!("Failed to create settings directory: {}", e);
        });
      }

      fs::write(
        editor_settings_file,
        serde_json::to_string(&default_settings).unwrap(),
      )
      .unwrap();

      default_settings
    }
  }
}

#[derive(Clone)]
pub struct SettingsService {
  pub settings: Arc<Mutex<Settings>>,
  pub editor_settings_file: PathBuf,
}

impl SettingsService {
  pub fn new(editor_settings_file: PathBuf) -> Self {
    let settings = Settings::load_from_file(&editor_settings_file);
    Self {
      settings: Arc::new(Mutex::new(settings)),
      editor_settings_file,
    }
  }

  pub fn get_settings(&self) -> Settings {
    tracing::info!("get_settings");
    self.settings.lock().unwrap().clone()
  }

  pub fn update_settings(&self, new_settings: SettingsPatch) -> Result<Settings, anyhow::Error> {
    let ab_doc_path = dirs::home_dir()
      .unwrap()
      .join(new_settings.doc_root_path.clone().unwrap_or_default());
    tracing::info!("ab_doc_path: {:?}", ab_doc_path);
    if !ab_doc_path.exists() {
      tracing::error!("doc_root_path does not exist: {:?}", ab_doc_path);
      return Err(anyhow::anyhow!(
        "Workspace does not exist: {:?}",
        ab_doc_path
      ));
    }

    let mut new_settings = new_settings;
    new_settings.doc_root_path = Some(ab_doc_path);
    self.settings.lock().unwrap().apply(new_settings);

    fs::write(
      &self.editor_settings_file,
      serde_json::to_string_pretty(&self.settings.lock().unwrap().clone()).unwrap(),
    )
    .unwrap();

    let updated_settings = self.settings.lock().unwrap().clone();
    tracing::info!("settings updated: {:?}", updated_settings);

    Ok(updated_settings)
  }
}
