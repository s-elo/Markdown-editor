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

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EditorSettings {
  pub doc_root_path: PathBuf,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
  pub ignore_dirs: Vec<String>,
}

impl Default for WorkspaceSettings {
  fn default() -> Self {
    Self {
      ignore_dirs: vec![
        String::from("imgs"),
        String::from("node_modules"),
        String::from("dist"),
      ],
    }
  }
}

impl Settings {
  pub fn load_from_file(editor_settings_file: &PathBuf) -> Self {
    if editor_settings_file.exists() {
      let file_content = fs::read_to_string(editor_settings_file).unwrap();

      let editor_settings: EditorSettings = serde_json::from_str(&file_content).unwrap();
      let workspace_settings =
        Self::load_workspace_settings_from_file(&editor_settings.doc_root_path);

      Settings {
        doc_root_path: editor_settings.doc_root_path,
        ignore_dirs: workspace_settings.ignore_dirs,
      }
    } else {
      let default_workspace_settings = WorkspaceSettings::default();
      let default_settings = Settings {
        doc_root_path: PathBuf::from(""),
        ignore_dirs: default_workspace_settings.ignore_dirs.clone(),
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

      if default_settings.doc_root_path.exists() {
        Self::set_workspace_settings(&default_settings.doc_root_path, &default_workspace_settings);
      }

      default_settings
    }
  }

  pub fn load_workspace_settings_from_file(doc_root_path: &PathBuf) -> WorkspaceSettings {
    let workspace_settings_file = doc_root_path.join(".workspace-settings.json");
    if workspace_settings_file.exists() {
      let file_content = fs::read_to_string(workspace_settings_file).unwrap();
      let workspace_settings: WorkspaceSettings = serde_json::from_str(&file_content).unwrap();
      workspace_settings
    } else {
      tracing::info!(
        "workspace_settings_file does not exist: {:?}",
        workspace_settings_file
      );

      let default_workspace_settings = WorkspaceSettings::default();

      if doc_root_path.exists() {
        Self::set_workspace_settings(doc_root_path, &default_workspace_settings);
      }

      default_workspace_settings
    }
  }

  pub fn set_workspace_settings(doc_root_path: &PathBuf, workspace_settings: &WorkspaceSettings) {
    let workspace_settings_file = doc_root_path.join(".workspace-settings.json");
    fs::write(
      workspace_settings_file,
      serde_json::to_string_pretty(workspace_settings).unwrap(),
    )
    .unwrap();
  }
}

#[derive(Clone)]
pub struct SettingsService {
  pub settings: Arc<Mutex<Settings>>,
  pub editor_settings_file: PathBuf,
}

impl SettingsService {
  pub fn new(editor_settings_file: PathBuf) -> Self {
    tracing::info!("editor_settings_file: {:?}", editor_settings_file);
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

    let updated_settings = self.settings.lock().unwrap().clone();
    tracing::info!("settings updated: {:?}", updated_settings);

    let new_editor_settings = EditorSettings {
      doc_root_path: updated_settings.doc_root_path.clone(),
    };
    let new_worksapce_settings = WorkspaceSettings {
      ignore_dirs: updated_settings.ignore_dirs.clone(),
    };

    fs::write(
      &self.editor_settings_file,
      serde_json::to_string_pretty(&new_editor_settings).unwrap(),
    )
    .unwrap();
    Settings::set_workspace_settings(&updated_settings.doc_root_path, &new_worksapce_settings);

    Ok(updated_settings)
  }
}
