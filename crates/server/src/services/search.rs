use std::{
  path::{Path, PathBuf},
  sync::{Arc, Mutex},
};

use grep_regex::RegexMatcherBuilder;
use grep_searcher::{Searcher, sinks::UTF8};
use ignore::WalkBuilder;
use serde::Serialize;

use crate::services::settings::SettingsService;

const INTERNAL_IGNORE_DIRS: &[&str] = &["_assets"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNameMatch {
  pub name: String,
  pub path: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LineMatch {
  pub line_number: u64,
  pub line_content: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContentMatches {
  pub name: String,
  pub path: Vec<String>,
  pub matches: Vec<LineMatch>,
}

pub struct SearchService {
  ignore_dirs: Arc<Mutex<Vec<String>>>,
  doc_root_path: Arc<Mutex<PathBuf>>,
  settings_service: Arc<SettingsService>,
}

impl SearchService {
  pub fn new(settings_service: Arc<SettingsService>) -> Self {
    let service = Self {
      ignore_dirs: Arc::new(Mutex::new(Vec::new())),
      doc_root_path: Arc::new(Mutex::new(PathBuf::new())),
      settings_service,
    };

    let settings = service.settings_service.get_settings();
    service.sync_settings(&settings);

    tracing::info!("[SearchService] Search initialized.");
    service
  }

  pub fn sync_settings(&self, settings: &crate::services::settings::Settings) {
    *self.ignore_dirs.lock().unwrap() = settings.ignore_dirs.clone();
    *self.doc_root_path.lock().unwrap() = settings.doc_root_path.clone();
  }

  pub fn search_file_names(&self, query: &str) -> Result<Vec<FileNameMatch>, anyhow::Error> {
    let doc_root = self.doc_root_path.lock().unwrap().clone();
    if !doc_root.exists() {
      return Err(anyhow::anyhow!(
        "Doc root path does not exist: {}",
        doc_root.display()
      ));
    }

    let ignore_dirs = self.ignore_dirs.lock().unwrap().clone();
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();

    for entry in self.build_walker(&doc_root, &ignore_dirs) {
      let entry = entry?;
      let path = entry.path();

      if !path.is_file() {
        continue;
      }
      if !Self::is_markdown(path) {
        continue;
      }

      let file_stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or_default();

      if file_stem.to_lowercase().contains(&query_lower) {
        let doc_path = Self::fs_path_to_doc_path(path, &doc_root);
        results.push(FileNameMatch {
          name: file_stem.to_string(),
          path: doc_path,
        });
      }
    }

    // Sort: exact prefix matches first, then alphabetically
    results.sort_by(|a, b| {
      let a_prefix = a.name.to_lowercase().starts_with(&query_lower);
      let b_prefix = b.name.to_lowercase().starts_with(&query_lower);
      match (a_prefix, b_prefix) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
      }
    });

    Ok(results)
  }

  pub fn search_content(
    &self,
    query: &str,
    case_insensitive: bool,
    include_patterns: &[String],
    exclude_patterns: &[String],
  ) -> Result<Vec<FileContentMatches>, anyhow::Error> {
    let doc_root = self.doc_root_path.lock().unwrap().clone();
    if !doc_root.exists() {
      return Err(anyhow::anyhow!(
        "Doc root path does not exist: {}",
        doc_root.display()
      ));
    }

    let ignore_dirs = self.ignore_dirs.lock().unwrap().clone();
    let escaped_query = regex::escape(query);
    let matcher = RegexMatcherBuilder::new()
      .case_insensitive(case_insensitive)
      .build(&escaped_query)?;

    let mut results = Vec::new();

    for entry in self.build_walker(&doc_root, &ignore_dirs) {
      let entry = entry?;
      let path = entry.path().to_path_buf();

      if !path.is_file() || !Self::is_markdown(&path) {
        continue;
      }

      if !include_patterns.is_empty() || !exclude_patterns.is_empty() {
        let rel = path.strip_prefix(&doc_root).unwrap_or(&path);
        let rel_str = rel.to_string_lossy().to_lowercase();

        if !include_patterns.is_empty()
          && !include_patterns
            .iter()
            .any(|p| rel_str.contains(&p.to_lowercase()))
        {
          continue;
        }
        if exclude_patterns
          .iter()
          .any(|p| rel_str.contains(&p.to_lowercase()))
        {
          continue;
        }
      }

      let mut line_matches = Vec::new();

      Searcher::new()
        .search_path(
          &matcher,
          &path,
          UTF8(|line_num, line| {
            line_matches.push(LineMatch {
              line_number: line_num,
              line_content: line.trim_end().to_string(),
            });
            Ok(true)
          }),
        )
        .unwrap_or_else(|e| {
          tracing::warn!("Failed to search file {}: {}", path.display(), e);
        });

      if !line_matches.is_empty() {
        let doc_path = Self::fs_path_to_doc_path(&path, &doc_root);
        let name = doc_path.last().cloned().unwrap_or_default();
        results.push(FileContentMatches {
          name,
          path: doc_path,
          matches: line_matches,
        });
      }
    }

    results.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(results)
  }

  fn build_walker<'a>(&self, doc_root: &Path, ignore_dirs: &'a [String]) -> ignore::Walk {
    let mut builder = WalkBuilder::new(doc_root);
    builder.hidden(true).git_ignore(true);

    let mut all_ignores: Vec<String> = ignore_dirs.to_vec();
    all_ignores.extend(INTERNAL_IGNORE_DIRS.iter().map(|s| s.to_string()));

    let mut overrides = ignore::overrides::OverrideBuilder::new(doc_root);
    for dir in &all_ignores {
      let _ = overrides.add(&format!("!{}/**", dir));
    }
    if let Ok(overrides) = overrides.build() {
      builder.overrides(overrides);
    }

    builder.build()
  }

  fn is_markdown(path: &Path) -> bool {
    path
      .extension()
      .and_then(|ext| ext.to_str())
      .map_or(false, |ext| ext == "md")
  }

  fn fs_path_to_doc_path(abs_path: &Path, doc_root: &Path) -> Vec<String> {
    let rel = abs_path.strip_prefix(doc_root).unwrap_or(abs_path);
    let mut parts: Vec<String> = rel
      .components()
      .map(|c| c.as_os_str().to_string_lossy().to_string())
      .collect();
    if let Some(last) = parts.last_mut() {
      if let Some(stripped) = last.strip_suffix(".md") {
        *last = stripped.to_string();
      }
    }
    parts
  }
}
