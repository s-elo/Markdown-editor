pub mod helpers;
pub mod structs;
mod test;

pub use helpers::{copy_dir_all, denormalize_path, normalize_path};

// Re-export all public types from structs
pub use structs::{
  Article, CopyCutDocRequest, CreateDocRequest, DeleteDocRequest, DocItem, GetArticleQuery,
  GetDocSubTreeQuery, UpdateArticleRequest, UpdateDocNameRequest,
};

use crate::services::settings::SettingsService;
use std::{
  fs,
  path::PathBuf,
  sync::{Arc, Mutex},
};

pub struct DocService {
  ignore_dirs: Arc<Mutex<Vec<String>>>,
  doc_root_path: Arc<Mutex<PathBuf>>,
  doc_root_path_depth: Arc<Mutex<usize>>,
  settings_service: Arc<SettingsService>,
}

impl DocService {
  /// Creates a new `DocService` instance and initializes it with current settings.
  pub fn new(settings_service: Arc<SettingsService>) -> Self {
    let service = Self {
      ignore_dirs: Arc::new(Mutex::new(Vec::new())),
      doc_root_path: Arc::new(Mutex::new(PathBuf::new())),
      doc_root_path_depth: Arc::new(Mutex::new(0)),
      settings_service,
    };

    // Initialize with current settings
    let settings = service.settings_service.get_settings();
    service.sync_settings(&settings);

    tracing::info!("[DocService] Docs initialized.");
    service
  }

  pub fn get_sub_doc_items(
    &self,
    folder_doc_path: &str,
    home_root_dir: bool,
  ) -> Result<Vec<DocItem>, anyhow::Error> {
    tracing::info!(
      "get_sub_doc_items: {:?}, {:?}",
      folder_doc_path,
      home_root_dir
    );

    let doc_path = self.path_convertor(folder_doc_path, false)?;
    let root_dir = Self::get_root_dir();

    #[cfg(target_os = "windows")]
    {
      // If folder_doc_path is empty and home_root_dir is true, return all available disks
      if folder_doc_path.is_empty() && home_root_dir {
        return Ok(Self::get_disks_folders(&root_dir));
      }
    }

    let ab_doc_path = if !home_root_dir {
      self.doc_root_path.lock().unwrap().join(doc_path)
    } else {
      // recover back to folder_doc_path, since path_convertor will add doc_root_path prefix, we need to remove it and add home dir prefix instead
      let doc_root = self.doc_root_path.lock().unwrap().clone();
      if doc_path.starts_with(&doc_root) {
        root_dir.join(doc_path.strip_prefix(doc_root).unwrap())
      } else {
        // for windows folder_doc_path like "C:/" will be converted to "C:" by path_convertor
        // and will not add the doc_root_path prefix, so just take folder_doc_path directly
        root_dir.join(folder_doc_path)
      }
    };
    if !ab_doc_path.exists() {
      tracing::error!("The folder doc path {} does not exist.", folder_doc_path);
      return Ok(Vec::new());
    }

    tracing::info!("ab_doc_path: {:?}", ab_doc_path,);

    let entries = fs::read_dir(&ab_doc_path)?;
    let mut docs = Vec::new();
    for entry in entries {
      let entry = entry?;
      let path = entry.path();
      let name = entry.file_name().to_string_lossy().to_string();
      // ignore hidden files/folders
      if name.starts_with('.') {
        continue;
      }

      let is_file = path.is_file();
      let is_valid_dir = !self.ignore_dirs.lock().unwrap().contains(&name);

      if is_file {
        if self.is_markdown(&name) {
          let mut file_path_parts = denormalize_path(folder_doc_path)
            .into_iter()
            .filter(|p| !p.is_empty())
            .collect::<Vec<String>>();
          let file_name = name.strip_suffix(".md").unwrap_or(&name).to_string();
          file_path_parts.push(file_name.clone());

          // add home dir prefix to display for UI
          if home_root_dir {
            file_path_parts.insert(0, root_dir.to_string_lossy().to_string());
          }

          let doc = DocItem {
            id: format!("{}-{}", file_name, file_path_parts.join("-")),
            name: file_name,
            is_file: true,
            path: file_path_parts,
          };

          docs.push(doc);
        }
      } else if is_valid_dir {
        let mut dir_path_parts = denormalize_path(folder_doc_path)
          .into_iter()
          .filter(|p| !p.is_empty())
          .collect::<Vec<String>>();
        dir_path_parts.push(name.clone());

        // add home dir prefix to display for UI
        if home_root_dir {
          dir_path_parts.insert(0, root_dir.to_string_lossy().to_string());
        }

        let doc = DocItem {
          id: format!("{}-{}", name, dir_path_parts.join("-")),
          name: name.clone(),
          is_file: false,
          path: dir_path_parts,
        };

        docs.push(doc);
      }
    }

    // Sort: directories first, then files, both alphabetically
    Self::sort_doc_items(&mut docs);

    Ok(docs)
  }

  /// Retrieves article content for a file. Returns `None` if the file doesn't exist.
  ///
  /// # Arguments
  /// * `file_path` - Normalized path string (percent-encoded), e.g., `"js%2Fbasic%2Farray"`
  ///
  /// # Example
  /// ```ignore
  /// // Get article at "js/basic/array.md"
  /// let article = doc_service.get_article("js%2Fbasic%2Farray")?;
  /// ```
  pub fn get_article(&self, file_path: &str) -> Result<Option<Article>, anyhow::Error> {
    let doc_path = self.path_convertor(file_path, true).unwrap();
    println!("{:?}", doc_path);
    if !doc_path.exists() {
      return Ok(None);
    }

    let content = fs::read_to_string(&doc_path)?;

    Ok(Some(Article {
      content,
      file_path: file_path.to_string(),
      headings: Vec::new(),
      keywords: Vec::new(),
    }))
  }

  /// Updates the content of an article file. Creates parent directories if needed.
  ///
  /// # Arguments
  /// * `update_path` - Normalized path string (percent-encoded), e.g., `"js%2Fbasic%2Farray"`
  /// * `content` - New content for the file
  ///
  /// # Example
  /// ```ignore
  /// // Update article at "js/basic/array.md"
  /// doc_service.update_article("js%2Fbasic%2Farray", "# New Content")?;
  /// ```
  pub fn update_article(&self, update_path: &str, content: &str) -> Result<(), anyhow::Error> {
    let converted_path = self.path_convertor(update_path, true)?;

    // Ensure parent directory exists
    if let Some(parent) = converted_path.parent() {
      fs::create_dir_all(parent)?;
    }

    fs::write(&converted_path, content)?;

    Ok(())
  }

  /// Creates a new document or directory at the specified path and updates the cache.
  ///
  /// # Arguments
  /// * `doc_path` - Normalized path string (percent-encoded), e.g., `"js%2Fbasic%2Fnew-doc"`
  /// * `is_file` - `true` for markdown files, `false` for directories
  ///
  /// # Example
  /// ```ignore
  /// // Create a new file at "js/basic/new-doc.md"
  /// let doc = doc_service.create_doc("js%2Fbasic%2Fnew-doc", true)?;
  ///
  /// // Create a new directory at "js/basic/new-folder"
  /// let dir = doc_service.create_doc("js%2Fbasic%2Fnew-folder", false)?;
  /// ```
  pub fn create_doc(&self, doc_path: &str, is_file: bool) -> Result<DocItem, anyhow::Error> {
    let created_path = self.path_convertor(doc_path, is_file)?;

    if is_file {
      if let Some(parent) = created_path.parent() {
        fs::create_dir_all(parent)?;
      }
      fs::File::create(&created_path)?;
    } else {
      fs::create_dir_all(&created_path)?;
    }

    let path_parts = denormalize_path(doc_path);
    let name = path_parts.last().unwrap().to_string();

    Ok(DocItem {
      id: format!("{}-{}", name, path_parts.join("-")),
      name,
      is_file,
      path: path_parts,
    })
  }

  /// Deletes a document or directory and removes it from the cache.
  ///
  /// # Arguments
  /// * `doc_path` - Normalized path string (percent-encoded), e.g., `"js%2Fbasic%2Fold-doc"`
  /// * `is_file` - `true` for markdown files, `false` for directories
  ///
  /// # Example
  /// ```ignore
  /// // Delete a file at "js/basic/old-doc.md"
  /// doc_service.delete_doc("js%2Fbasic%2Fold-doc", true)?;
  ///
  /// // Delete a directory at "js/basic/old-folder"
  /// doc_service.delete_doc("js%2Fbasic%2Fold-folder", false)?;
  /// ```
  pub fn delete_doc(&self, doc_path: &str, is_file: bool) -> Result<(), anyhow::Error> {
    let delete_path = self.path_convertor(doc_path, is_file)?;

    fs::remove_dir_all(&delete_path).or_else(|_| fs::remove_file(&delete_path))?;

    Ok(())
  }

  /// Copies or moves a document/directory from `copy_cut_path` to `paste_path`.
  /// If `is_copy` is true, performs a copy; otherwise, moves the item.
  ///
  /// # Arguments
  /// * `copy_cut_path` - Source normalized path, e.g., `"js%2Fbasic%2Fsource"`
  /// * `paste_path` - Destination normalized path, e.g., `"js%2Fadvanced%2Fdestination"`
  /// * `is_copy` - `true` to copy, `false` to move
  /// * `is_file` - `true` for markdown files, `false` for directories
  ///
  /// # Example
  /// ```ignore
  /// // Copy a file from "js/basic/source.md" to "js/advanced/destination.md"
  /// doc_service.copy_cut_doc("js%2Fbasic%2Fsource", "js%2Fadvanced%2Fdestination", true, true)?;
  ///
  /// // Move a directory from "js/basic/folder" to "js/advanced/folder"
  /// doc_service.copy_cut_doc("js%2Fbasic%2Ffolder", "js%2Fadvanced%2Ffolder", false, false)?;
  /// ```
  pub fn copy_cut_doc(
    &self,
    copy_cut_path: &str,
    paste_path: &str,
    is_copy: bool,
    is_file: bool,
  ) -> Result<(), anyhow::Error> {
    let paste_parent_path = {
      let mut path_parts = denormalize_path(paste_path);
      path_parts.pop();
      let parent_path = if path_parts.is_empty() {
        String::new()
      } else {
        normalize_path(&path_parts)
      };
      self.path_convertor(&parent_path, false)?
    };

    if !paste_parent_path.exists() {
      return Err(anyhow::anyhow!(
        "The parent path {:?} of the paste path {} does not exist.",
        paste_parent_path,
        paste_path
      ));
    }

    let source_path = self.path_convertor(copy_cut_path, is_file)?;
    let dest_path = self.path_convertor(paste_path, is_file)?;

    if is_copy {
      if is_file {
        fs::copy(&source_path, &dest_path)?;
      } else {
        copy_dir_all(&source_path, &dest_path)?;
      }
    } else {
      fs::rename(&source_path, &dest_path)?;
    }

    Ok(())
  }

  /// Renames a document or directory. Updates all child paths if renaming a directory.
  ///
  /// # Arguments
  /// * `modify_path` - Current normalized path, e.g., `"js%2Fbasic%2Fold-name"`
  /// * `name` - New name (without path), e.g., `"new-name"`
  /// * `is_file` - `true` for markdown files, `false` for directories
  ///
  /// # Example
  /// ```ignore
  /// // Rename file "js/basic/old-name.md" to "js/basic/new-name.md"
  /// doc_service.modify_name("js%2Fbasic%2Fold-name", "new-name", true)?;
  ///
  /// // Rename directory "js/basic/old-folder" to "js/basic/new-folder"
  /// doc_service.modify_name("js%2Fbasic%2Fold-folder", "new-folder", false)?;
  /// ```
  pub fn modify_name(
    &self,
    modify_path: &str,
    name: &str,
    is_file: bool,
  ) -> Result<(), anyhow::Error> {
    let cur_path = self.path_convertor(modify_path, is_file)?;

    if !cur_path.exists() {
      return Ok(());
    }

    let new_path = self.path_convertor_with_name(modify_path, is_file, Some(name))?;
    if new_path.to_str() == cur_path.to_str() {
      tracing::info!(
        "The new path is the same as the current path, so skip the rename. {}",
        cur_path.display()
      );
      return Ok(());
    }
    println!("{:?}, {:?}", cur_path, new_path);
    fs::rename(&cur_path, &new_path)?;

    Ok(())
  }

  /// Synchronizes service state with settings and refreshes the document cache.
  pub fn sync_settings(&self, settings: &crate::services::settings::Settings) {
    *self.ignore_dirs.lock().unwrap() = settings.ignore_dirs.clone();
    *self.doc_root_path.lock().unwrap() = settings.doc_root_path.clone();
    *self.doc_root_path_depth.lock().unwrap() = settings.doc_root_path.components().count();

    if !self.doc_root_path.lock().unwrap().exists() {
      tracing::warn!(
        "[DocService] Doc root path: {} does not exist, should let user to provide correct path in settings.",
        self.doc_root_path.lock().unwrap().display()
      );
      return;
    }
  }

  /// Checks if a file name has a markdown extension.
  fn is_markdown(&self, file_name: &str) -> bool {
    file_name.ends_with(".md")
  }

  /// Converts a normalized path string to a filesystem path.
  ///
  /// # Arguments
  /// * `str_path` - Normalized path (percent-encoded), e.g., `"js%2Fbasic%2Farray"`
  /// * `is_file` - `true` to append `.md` extension, `false` for directories
  ///
  /// # Example
  /// ```ignore
  /// // Converts "js%2Fbasic%2Farray" to "js/basic/array.md" (if is_file=true)
  /// // or "js/basic/array" (if is_file=false)
  /// let path = doc_service.path_convertor("js%2Fbasic%2Farray", true)?;
  /// ```
  fn path_convertor(&self, str_path: &str, is_file: bool) -> Result<PathBuf, anyhow::Error> {
    self.path_convertor_with_name(str_path, is_file, None)
  }

  /// Converts a normalized path to a filesystem path, optionally replacing the last component with `name`.
  fn path_convertor_with_name(
    &self,
    str_path: &str,
    is_file: bool,
    name: Option<&str>,
  ) -> Result<PathBuf, anyhow::Error> {
    let mut path_parts = denormalize_path(str_path);

    if let Some(new_name) = name {
      if let Some(last) = path_parts.last_mut() {
        *last = new_name.to_string();
      }
    }

    let doc_root = self.doc_root_path.lock().unwrap().clone();

    let mut full_path = doc_root;
    for part in path_parts {
      full_path.push(part);
    }

    if is_file {
      full_path.set_extension("md");
    }

    Ok(full_path)
  }

  fn sort_doc_items(doc_items: &mut Vec<DocItem>) {
    doc_items.sort_by(|a, b| match (a.is_file, b.is_file) {
      (true, false) => std::cmp::Ordering::Greater,
      (false, true) => std::cmp::Ordering::Less,
      _ => {
        if a.is_file {
          a.id.to_lowercase().cmp(&b.id.to_lowercase())
        } else {
          a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
      }
    });
  }

  fn get_root_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
      // For Windows service, return "" for UI
      return PathBuf::from("");
    }

    #[cfg(target_os = "macos")]
    {
      return PathBuf::from("/");
    }
  }

  /// Lists all available disk roots on Windows.
  /// Returns paths like ["C:\\", "D:\\", "E:\\"] for available drives.
  #[cfg(target_os = "windows")]
  fn list_available_disks() -> Vec<PathBuf> {
    let mut disks = Vec::new();
    for drive_letter in b'A'..=b'Z' {
      let drive_path = PathBuf::from(format!("{}:/", drive_letter as char));
      if drive_path.exists() {
        disks.push(drive_path);
      }
    }
    disks
  }

  #[cfg(target_os = "windows")]
  fn get_disks_folders(root_dir: &PathBuf) -> Vec<DocItem> {
    return Self::list_available_disks()
      .into_iter()
      .map(|disk_path| {
        let disk_name = disk_path
          .to_string_lossy()
          // .trim_end_matches('\\')
          .to_string();
        DocItem {
          id: disk_name.clone(),
          name: disk_name.clone(),
          is_file: false,
          // add a virtual root_dir prefix to display for UI
          path: vec![root_dir.to_string_lossy().to_string(), disk_name],
        }
      })
      .collect();
  }
}
