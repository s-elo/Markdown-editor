use std::sync::{Arc, Mutex};

use git2::{Repository, Status, StatusOptions};

use crate::services::{settings::Settings, settings::SettingsService};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StatusType {
  Added,
  Modified,
  Deleted,
  Untracked,
  Rename,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Change {
  pub change_path: String,
  pub status: StatusType,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
  pub workspace: Vec<Change>,
  pub staged: Vec<Change>,
  pub changes: bool,
  pub no_git: bool,
}

#[derive(Clone)]
pub struct GitService {
  repo: Arc<Mutex<Option<Repository>>>,
  settings_service: Arc<SettingsService>,
}

impl GitService {
  pub fn new(settings_service: Arc<SettingsService>) -> Self {
    let service = Self {
      repo: Arc::new(Mutex::new(None)),
      settings_service,
    };

    // Initialize with current settings
    let settings = service.settings_service.get_settings().clone();
    service.sync_git(&settings);

    // TODO: Initialize git pull?
    // service.init_git_pull();

    service
  }

  fn _init_git_pull(&self) {
    let repo_clone = self.repo.clone();
    let git_service_clone = self.clone();
    tokio::spawn(async move {
      if let Some(_) = repo_clone.lock().unwrap().as_ref() {
        tracing::info!("[GitService] git initially pulling...");
        if let Err(e) = git_service_clone.exec_pull() {
          tracing::info!("[GitService] failed to pull doc: {}", e);
        } else {
          tracing::info!("[GitService] doc is updated!");
        }
      }
    });
  }

  pub fn get_status(&self) -> Result<GitStatus, anyhow::Error> {
    let repo_guard = self.repo.lock().unwrap();
    let repo = repo_guard
      .as_ref()
      .ok_or_else(|| anyhow::anyhow!("No git repository"))?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.include_ignored(false);
    opts.recurse_untracked_dirs(true);

    let statuses = repo.statuses(Some(&mut opts))?;

    let mut workspace: Vec<Change> = Vec::new();
    let mut staged: Vec<Change> = Vec::new();

    for entry in statuses.iter() {
      let status = entry.status();
      let path = entry.path().unwrap_or("").to_string();

      // Check for untracked files (WT_NEW but not INDEX_NEW means untracked)
      let is_untracked = status.contains(Status::WT_NEW) && !status.contains(Status::INDEX_NEW);
      if is_untracked {
        workspace.push(Change {
          change_path: path.clone(),
          status: StatusType::Untracked,
        });
        continue;
      }

      // Working directory changes (only if not already staged)
      if status.contains(Status::WT_MODIFIED) && !status.contains(Status::INDEX_MODIFIED) {
        workspace.push(Change {
          change_path: path.clone(),
          status: StatusType::Modified,
        });
      }
      if status.contains(Status::WT_DELETED) && !status.contains(Status::INDEX_DELETED) {
        workspace.push(Change {
          change_path: path.clone(),
          status: StatusType::Deleted,
        });
      }
      if status.contains(Status::WT_RENAMED) && !status.contains(Status::INDEX_RENAMED) {
        workspace.push(Change {
          change_path: path.clone(),
          status: StatusType::Rename,
        });
      }
      if status.contains(Status::WT_TYPECHANGE) {
        workspace.push(Change {
          change_path: path.clone(),
          status: StatusType::Modified,
        });
      }

      // Staged changes
      if status.contains(Status::INDEX_NEW) {
        staged.push(Change {
          change_path: path.clone(),
          status: StatusType::Added,
        });
      }
      if status.contains(Status::INDEX_MODIFIED) {
        staged.push(Change {
          change_path: path.clone(),
          status: StatusType::Modified,
        });
      }
      if status.contains(Status::INDEX_DELETED) {
        staged.push(Change {
          change_path: path.clone(),
          status: StatusType::Deleted,
        });
      }
      if status.contains(Status::INDEX_RENAMED) {
        staged.push(Change {
          change_path: path.clone(),
          status: StatusType::Rename,
        });
      }
      if status.contains(Status::INDEX_TYPECHANGE) {
        staged.push(Change {
          change_path: path.clone(),
          status: StatusType::Modified,
        });
      }
    }

    Ok(GitStatus {
      workspace,
      staged,
      changes: !statuses.is_empty(),
      no_git: false,
    })
  }

  pub fn add(&self, change_paths: Vec<String>) -> Result<(), anyhow::Error> {
    let repo_guard = self.repo.lock().unwrap();
    let repo = repo_guard
      .as_ref()
      .ok_or_else(|| anyhow::anyhow!("No git repository"))?;

    let mut index = repo.index()?;

    // Paths from frontend are relative to doc_root_path (which should be the git repo root)
    // So we can add them directly
    for path in change_paths {
      let path_obj = std::path::Path::new(&path);
      index.add_path(path_obj)?;
    }

    index.write()?;
    Ok(())
  }

  /// Helper method to execute git commands with common validation and error handling
  fn exec_git_command<F>(
    &self,
    command: &str,
    error_prefix: &str,
    build_args: F,
  ) -> Result<(), anyhow::Error>
  where
    F: FnOnce(&mut std::process::Command) -> &mut std::process::Command,
  {
    if !self.is_repo() {
      return Err(anyhow::anyhow!("No git repository"));
    }

    let settings = self.settings_service.get_settings();
    let git_root = &settings.doc_root_path;

    if !git_root.exists() {
      return Err(anyhow::anyhow!(
        "Git root path does not exist: {:?}",
        git_root
      ));
    }

    let mut cmd = std::process::Command::new("git");
    cmd.arg(command).current_dir(git_root);
    build_args(&mut cmd);

    let output = cmd.output()?;

    if !output.status.success() {
      let stderr = String::from_utf8_lossy(&output.stderr);
      return Err(anyhow::anyhow!("{}: {}", error_prefix, stderr.trim()));
    }

    Ok(())
  }

  pub fn exec_commit(&self, message: String) -> Result<(), anyhow::Error> {
    self.exec_git_command("commit", "Git commit failed", |cmd| {
      cmd.arg("-m").arg(&message)
    })?;
    tracing::info!("[GitService] Executed commit with message: {}", message);
    Ok(())
  }

  pub fn exec_push(&self) -> Result<(), anyhow::Error> {
    self.exec_git_command("push", "Git push failed", |cmd| cmd)?;
    tracing::info!("[GitService] Executed push");
    Ok(())
  }

  pub fn pull(&self) -> Result<(), anyhow::Error> {
    self.exec_pull()?;

    Ok(())
  }

  fn exec_pull(&self) -> Result<(), anyhow::Error> {
    self.exec_git_command("pull", "Git pull failed", |cmd| cmd)?;
    tracing::info!("[GitService] Executed pull");
    Ok(())
  }

  pub fn restore(&self, staged: bool, changes: Vec<Change>) -> Result<(), anyhow::Error> {
    let settings = self.settings_service.get_settings();

    if staged {
      // Restore staged changes: git restore --staged <paths>
      let paths: Vec<&str> = changes.iter().map(|c| c.change_path.as_str()).collect();
      self.exec_git_command("restore", "Git restore --staged failed", |cmd| {
        cmd.arg("--staged").args(&paths)
      })?;
    } else {
      // Restore working directory changes
      let untracked: Vec<_> = changes
        .iter()
        .filter(|c| matches!(c.status, StatusType::Untracked))
        .collect();

      // Delete untracked files
      for change in &untracked {
        let full_path = settings.doc_root_path.join(&change.change_path);
        if full_path.exists() {
          if full_path.is_file() {
            std::fs::remove_file(&full_path)?;
          } else {
            std::fs::remove_dir_all(&full_path)?;
          }
        }
      }

      // Restore tracked files: git restore <paths>
      let tracked: Vec<_> = changes
        .iter()
        .filter(|c| !matches!(c.status, StatusType::Untracked))
        .collect();

      if !tracked.is_empty() {
        let paths: Vec<&str> = tracked.iter().map(|c| c.change_path.as_str()).collect();
        self.exec_git_command("restore", "Git restore failed", |cmd| cmd.args(&paths))?;
      }
    }

    Ok(())
  }

  pub fn sync_git(&self, settings: &Settings) {
    let doc_root_path = &settings.doc_root_path;
    let repo = if doc_root_path.exists() {
      Repository::open(doc_root_path).ok()
    } else {
      None
    };

    *self.repo.lock().unwrap() = repo;
  }

  pub fn is_repo(&self) -> bool {
    self.repo.lock().unwrap().is_some()
  }
}
