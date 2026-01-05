pub mod helpers;
pub mod structs;
mod test;

pub use helpers::{copy_dir_all, denormalize_path, normalize_path};

// Re-export all public types from structs
pub use structs::{
  Article, CopyCutDocRequest, CreateDocRequest, DeleteDocRequest, Doc, GetArticleQuery,
  NormalizedDoc, NormalizedDocMap, UpdateArticleRequest, UpdateDocNameRequest,
};

use crate::services::settings::SettingsService;
use std::{
  collections::HashMap,
  fs,
  path::{Path, PathBuf},
  sync::{Arc, Mutex},
};

pub struct DocService {
  docs: Arc<Mutex<Vec<Doc>>>,
  nor_docs: Arc<Mutex<NormalizedDocMap>>,
  ignore_dirs: Arc<Mutex<Vec<String>>>,
  doc_root_path: Arc<Mutex<PathBuf>>,
  doc_root_path_depth: Arc<Mutex<usize>>,
  settings_service: Arc<SettingsService>,
}

impl DocService {
  /// Creates a new `DocService` instance and initializes it with current settings.
  pub fn new(settings_service: Arc<SettingsService>) -> Self {
    let service = Self {
      docs: Arc::new(Mutex::new(Vec::new())),
      nor_docs: Arc::new(Mutex::new(HashMap::new())),
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

  /// Refreshes the document cache by re-scanning the file system.
  pub fn refresh_doc(&self) -> Result<(), anyhow::Error> {
    let docs = self.get_docs(true)?;

    *self.docs.lock().unwrap() = docs.clone();
    *self.nor_docs.lock().unwrap() = self.doc_normalizer(&docs);

    Ok(())
  }

  /// Retrieves the document tree. Returns cached docs unless `force` is true.
  pub fn get_docs(&self, force: bool) -> Result<Vec<Doc>, anyhow::Error> {
    // Check cache first
    {
      let docs = self.docs.lock().unwrap();
      if !docs.is_empty() && !force {
        tracing::info!("[DocService] getDocs: get docs from cache.");
        return Ok(docs.clone());
      }
    }

    let doc_root_path = self.doc_root_path.lock().unwrap().clone();
    let doc_root_path_depth = *self.doc_root_path_depth.lock().unwrap();
    let ignore_dirs = self.ignore_dirs.lock().unwrap().clone();

    self.get_docs_recursive(&doc_root_path, doc_root_path_depth, &ignore_dirs)
  }

  /// Recursively scans the filesystem to build a doc tree, ignoring specified directories.
  fn get_docs_recursive(
    &self,
    doc_root_path: &Path,
    root_depth: usize,
    ignore_dirs: &[String],
  ) -> Result<Vec<Doc>, anyhow::Error> {
    let mut docs = Vec::new();
    if !doc_root_path.exists() {
      return Ok(docs);
    }

    let entries = fs::read_dir(doc_root_path)?;

    for entry in entries {
      let entry = entry?;
      let path = entry.path();
      let name = entry.file_name().to_string_lossy().to_string();

      let is_file = path.is_file();
      let is_valid_dir = !ignore_dirs.contains(&name);

      if is_file {
        if self.is_markdown(&name) {
          // will use BE search later
          // let content = fs::read_to_string(&path)?;
          // let (headings, keywords) = self.doc_extractor(&content, 4);

          let file_path = self.get_relative_path(&path, root_depth)?;
          let file_name = name.strip_suffix(".md").unwrap_or(&name).to_string();

          let doc = Doc {
            id: format!("{}-{}", file_name, file_path.join("-")),
            name: file_name,
            is_file: true,
            path: file_path,
            children: Vec::new(),
            headings: Vec::new(),
            keywords: Vec::new(),
          };

          docs.push(doc);
        }
      } else if is_valid_dir {
        let children = self.get_docs_recursive(&path, root_depth, ignore_dirs)?;
        let dir_path = self.get_relative_path(&path, root_depth)?;

        let doc = Doc {
          id: format!("{}-{}", name, dir_path.join("-")),
          name: name.clone(),
          is_file: false,
          path: dir_path,
          children,
          headings: Vec::new(),
          keywords: Vec::new(),
        };

        docs.push(doc);
      }
    }

    // Sort: directories first, then files, both alphabetically
    Self::sort_docs(&mut docs);

    Ok(docs)
  }

  /// Returns a clone of the normalized document map (keyed by normalized paths).
  pub fn get_normalized_docs(&self) -> NormalizedDocMap {
    self.nor_docs.lock().unwrap().clone()
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

    // Check cache
    let nor_docs = self.nor_docs.lock().unwrap();
    if let Some(nor_doc) = nor_docs.get(file_path) {
      return Ok(Some(Article {
        content,
        file_path: file_path.to_string(),
        headings: nor_doc.headings.clone(),
        keywords: nor_doc.keywords.clone(),
      }));
    }
    drop(nor_docs);

    // let (headings, keywords) = self.doc_extractor(&content, 4);
    // let keywords: Vec<String> = keywords
    //   .iter()
    //   .map(|k| k.replace("**", ""))
    //   .collect::<std::collections::HashSet<_>>()
    //   .into_iter()
    //   .collect();

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
  pub fn create_doc(&self, doc_path: &str, is_file: bool) -> Result<Doc, anyhow::Error> {
    let created_path = self.path_convertor(doc_path, is_file)?;

    if is_file {
      if let Some(parent) = created_path.parent() {
        fs::create_dir_all(parent)?;
      }
      fs::File::create(&created_path)?;
    } else {
      fs::create_dir_all(&created_path)?;
    }

    self.create_new_doc_at_cache(doc_path, is_file)
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

    self.delete_doc_at_cache(doc_path);
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

    // Too complex to update cache, so just refresh the whole doc tree and normalized doc map
    self.refresh_doc()?;

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

    self.modify_name_at_cache(modify_path, name, is_file)?;
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

    if let Err(e) = self.refresh_doc() {
      tracing::error!("[DocService] Failed to refresh docs: {}", e);
    }
  }

  /// Creates a new doc item in both the doc tree and normalized doc map.
  /// `doc_path` should be a normalized path (e.g., "xx%2Fxx%2Fxx").
  fn create_new_doc_at_cache(&self, doc_path: &str, is_file: bool) -> Result<Doc, anyhow::Error> {
    let path_parts = denormalize_path(doc_path);
    let doc_name = path_parts.last().unwrap().to_string();
    let parent_dir_nor_path = if path_parts.len() > 1 {
      normalize_path(&path_parts[..path_parts.len() - 1])
    } else {
      String::new()
    };

    let new_doc = Doc {
      id: format!("{}-{}", doc_name, doc_path),
      name: doc_name.clone(),
      is_file,
      path: path_parts.clone(),
      children: Vec::new(),
      headings: Vec::new(),
      keywords: Vec::new(),
    };
    let mut new_nor_doc = NormalizedDoc {
      id: format!("{}-{}", doc_name, doc_path),
      name: doc_name.clone(),
      is_file,
      children_keys: Vec::new(),
      path: path_parts.clone(),
      headings: Vec::new(),
      keywords: Vec::new(),
      parent_key: None,
    };

    let mut docs = self.docs.lock().unwrap();
    let mut nor_docs = self.nor_docs.lock().unwrap();

    if parent_dir_nor_path.is_empty() {
      // Root path
      nor_docs.insert(doc_path.to_string(), new_nor_doc);

      docs.push(new_doc.clone());
      Self::sort_docs(&mut docs);
    } else {
      // Update parent normalized doc's children
      if let Some(parent_nor_doc) = nor_docs.get_mut(&parent_dir_nor_path) {
        // Add child key to parent's children_keys
        parent_nor_doc.children_keys.push(doc_path.to_string());
      }
      // Set parent_key for the new doc and insert
      new_nor_doc.parent_key = Some(parent_dir_nor_path.clone());
      nor_docs.insert(doc_path.to_string(), new_nor_doc);
      Self::sort_normalized_childrent_keys(&mut nor_docs, &parent_dir_nor_path);

      // Find and update children in docs tree
      Self::find_doc_mut(&mut docs, &parent_dir_nor_path, |parent_doc| {
        parent_doc.children.push(new_doc.clone());
        Self::sort_docs(&mut parent_doc.children);
      })?;
    }

    // Sync all children to nor_docs (for copy/cut operations where new_doc has children)
    let mut new_docs = vec![(new_doc.clone(), doc_path.to_string())];
    while let Some((parent_doc, parent_path)) = new_docs.pop() {
      for child in &parent_doc.children {
        let child_path = normalize_path(&child.path);
        let child_nor_doc = NormalizedDoc {
          name: child.name.clone(),
          id: child.id.clone(),
          is_file: child.is_file,
          children_keys: child
            .children
            .iter()
            .map(|c| normalize_path(&c.path))
            .collect(),
          path: child.path.clone(),
          headings: child.headings.clone(),
          keywords: child.keywords.clone(),
          parent_key: Some(parent_path.clone()),
        };
        nor_docs.insert(child_path.clone(), child_nor_doc);
        new_docs.push((child.clone(), child_path));
      }
    }

    Ok(new_doc)
  }

  /// Removes a doc from both the doc tree and normalized doc map, including all children.
  fn delete_doc_at_cache(&self, doc_path: &str) {
    let mut docs = self.docs.lock().unwrap();
    let mut nor_docs = self.nor_docs.lock().unwrap();

    let entry = match nor_docs.remove(doc_path) {
      Some(e) => e,
      None => return,
    };

    // Remove from parent
    if let Some(parent_key) = &entry.parent_key {
      // Parent is not root, update parent doc's children_keys
      if let Some(parent_entry) = nor_docs.get_mut(parent_key) {
        parent_entry.children_keys.retain(|k| k != doc_path);
      }
      // Also update in docs tree
      self.remove_from_docs_tree(&mut docs, parent_key, doc_path);
    } else {
      // Root doc
      docs.retain(|d| normalize_path(&d.path) != doc_path);
    }

    // Delete all children from nor_docs (recursively using children_keys)
    let mut delete_keys = entry.children_keys.clone();
    while let Some(key_to_delete) = delete_keys.pop() {
      if let Some(entry_to_delete) = nor_docs.remove(&key_to_delete) {
        // Add children keys to deletion queue
        delete_keys.extend(entry_to_delete.children_keys);
      }
    }
  }

  /// Updates the name in both normalized doc map and doc tree.
  fn modify_name_at_cache(
    &self,
    modify_path: &str,
    new_name: &str,
    is_file: bool,
  ) -> Result<(), anyhow::Error> {
    self.update_name_in_nor_doc(modify_path, new_name, is_file)?;
    self.update_name_in_doc_tree(modify_path, new_name, is_file)?;

    Ok(())
  }

  /// Updates the name, path, and ID of a doc in the doc tree, including all children if it's a directory.
  fn update_name_in_doc_tree(
    &self,
    modify_path: &str,
    new_name: &str,
    is_file: bool,
  ) -> Result<(), anyhow::Error> {
    let mut docs = self.docs.lock().unwrap();
    let nor_docs = self.nor_docs.lock().unwrap();

    Self::find_doc_mut(&mut docs, &modify_path, |doc| {
      // Update the name, id and path of the doc
      doc.name = new_name.to_string();
      if let Some(last) = doc.path.last_mut() {
        *last = new_name.to_string();
      }
      doc.id = format!("{}-{}", new_name, doc.path.join("-"));

      if !is_file {
        // Update children's path and id
        let new_doc_depth = denormalize_path(modify_path).len();
        let mut new_doc_paths = doc.path.clone();
        if let Err(e) = Self::for_each_doc_mut(&mut doc.children, |child| {
          let mut child_path = child.path.clone();
          new_doc_paths.truncate(new_doc_depth);
          child_path.splice(0..new_doc_depth, new_doc_paths.clone());
          child.path = child_path;

          let mut new_parent_path = child.path.clone();
          new_parent_path.truncate(child.path.len() - 1);

          child.id = format!("{}-{}", child.name, child.path.join("-"));
        }) {
          tracing::error!("Failed to update children's path and id: {}", e);
        }
      }
    })?;

    // Sort the parent's children
    let parent_key = nor_docs.get(modify_path).and_then(|e| e.parent_key.clone());
    if let Some(parent_key) = parent_key {
      Self::find_doc_mut(&mut docs, &parent_key, |doc| {
        Self::sort_docs(&mut doc.children);
      })?;
    } else {
      // Root parent
      Self::sort_docs(&mut docs);
    }

    Ok(())
  }

  /// Updates the name and path of a normalized doc and re-inserts it with the new key.
  fn update_name_in_nor_doc(
    &self,
    modify_path: &str,
    new_name: &str,
    is_file: bool,
  ) -> Result<(), anyhow::Error> {
    let mut nor_docs = self.nor_docs.lock().unwrap();
    let entry = nor_docs
      .get_mut(modify_path)
      .ok_or_else(|| anyhow::anyhow!("Doc not found: {}", modify_path))?;

    entry.name = new_name.to_string();
    if let Some(last) = entry.path.last_mut() {
      *last = new_name.to_string();
    }
    entry.id = format!("{}-{}", new_name, entry.path.join("-"));

    let new_path = normalize_path(&entry.path);
    let parent_key = entry.parent_key.clone();
    let modified_nor_doc = entry.clone();

    // Update the entry in nor_docs
    nor_docs.insert(new_path.clone(), modified_nor_doc.clone());
    nor_docs.remove(modify_path);

    if let Some(parent_key) = &parent_key {
      // Update parent's children_keys
      if let Some(parent_entry) = nor_docs.get_mut(parent_key) {
        parent_entry.children_keys.push(new_path.clone());
        Self::sort_normalized_childrent_keys(&mut nor_docs, parent_key);
      }
    }

    if !is_file {
      // e.g. old path: ["basics", "old_test1"]; new path: ["basics", "test1"]
      let mut new_doc_paths = modified_nor_doc.path.clone();
      // e.g. 2
      let new_doc_depth = new_doc_paths.len();

      // Update children's parent_key, path and id
      Self::for_each_nor_doc_child_mut(&mut nor_docs, &modified_nor_doc, |child_entry| {
        // child path: e.g. ["basics", "old_test1", "test2"]
        // to ["basics", "test1", "test2"]
        let mut child_path = child_entry.path.clone();
        new_doc_paths.truncate(new_doc_depth);
        child_path.splice(0..new_doc_depth, new_doc_paths.clone());
        child_entry.path = child_path;

        let mut new_parent_path = child_entry.path.clone();
        new_parent_path.truncate(child_entry.path.len() - 1);
        child_entry.parent_key = Some(normalize_path(&new_parent_path));

        child_entry.id = format!("{}-{}", child_entry.name, child_entry.path.join("-"));
      })?;
    }

    Ok(())
  }

  /// Converts a doc tree into a normalized map keyed by normalized paths.
  fn doc_normalizer(&self, docs: &[Doc]) -> NormalizedDocMap {
    let mut normalized = HashMap::new();
    self.normalize_recursive(docs, None, &mut normalized);
    normalized
  }

  /// Recursively converts a doc tree into normalized docs and inserts them into the map.
  fn normalize_recursive(
    &self,
    docs: &[Doc],
    parent_key: Option<&str>,
    normalized: &mut NormalizedDocMap,
  ) {
    for doc in docs {
      let nor_path = normalize_path(&doc.path);

      normalized.insert(
        nor_path.clone(),
        NormalizedDoc {
          name: doc.name.clone(),
          id: doc.id.clone(),
          is_file: doc.is_file,
          children_keys: doc
            .children
            .iter()
            .map(|c| normalize_path(&c.path))
            .collect(),
          path: doc.path.clone(),
          headings: doc.headings.clone(),
          keywords: doc.keywords.clone(),
          parent_key: parent_key.map(|s| s.to_string()),
        },
      );

      if !doc.is_file {
        self.normalize_recursive(&doc.children, Some(&nor_path), normalized);
      }
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

  /// Extracts the relative path components from a filesystem path, skipping `root_depth` components.
  fn get_relative_path(
    &self,
    path: &Path,
    root_depth: usize,
  ) -> Result<Vec<String>, anyhow::Error> {
    let components: Vec<String> = path
      .components()
      .skip(root_depth)
      .filter_map(|c| {
        if let std::path::Component::Normal(os_str) = c {
          os_str
            .to_str()
            .map(|s| s.strip_suffix(".md").unwrap_or(s).to_string())
        } else {
          None
        }
      })
      .collect();

    Ok(components)
  }

  /// Removes a doc from its parent's children in the docs tree.
  fn remove_from_docs_tree(&self, docs: &mut Vec<Doc>, parent_key: &str, doc_path: &str) {
    let mut stack: Vec<&mut Doc> = docs.iter_mut().collect();
    while let Some(doc) = stack.pop() {
      if normalize_path(&doc.path) == parent_key {
        doc.children.retain(|d| normalize_path(&d.path) != doc_path);
        return;
      }
      stack.extend(doc.children.iter_mut());
    }
  }

  /// Recursively applies a closure to all children of a normalized doc.
  fn for_each_nor_doc_child_mut<F>(
    nor_docs: &mut NormalizedDocMap,
    nor_doc: &NormalizedDoc,
    mut f: F,
  ) -> Result<(), anyhow::Error>
  where
    F: FnMut(&mut NormalizedDoc),
  {
    let mut stack = nor_doc.children_keys.clone();
    while let Some(key) = stack.pop() {
      if let Some(child_entry) = nor_docs.get_mut(&key) {
        f(child_entry);
        stack.extend(child_entry.children_keys.clone());
      }
    }

    Ok(())
  }

  /// Iterate through all docs in the tree and apply a mutable closure to each one.
  /// This is useful for bulk updates like changing paths, IDs, or other properties.
  ///
  /// # Parameters
  /// - `docs`: The root vector of docs to iterate through
  /// - `f`: A closure that receives a mutable reference to each doc
  ///
  /// # Example
  /// ```ignore
  /// // Update all doc paths after a rename
  /// Self::for_each_doc_mut(&mut docs, |doc| {
  ///   doc.id = format!("{}-{}", doc.name, doc.path.join("-"));
  /// })?;
  /// ```
  fn for_each_doc_mut<F>(docs: &mut Vec<Doc>, mut f: F) -> Result<(), anyhow::Error>
  where
    F: FnMut(&mut Doc),
  {
    let mut stack: Vec<&mut Doc> = docs.iter_mut().collect();

    while let Some(doc) = stack.pop() {
      f(doc);
      stack.extend(doc.children.iter_mut());
    }

    Ok(())
  }

  /// Find a doc by normalized path and apply a closure to it.
  /// This allows safe mutation of the doc while the lock is held.
  ///
  /// # Parameters
  /// - `normalized_path`: The normalized path (e.g., "js%2Fbasic%2Farray")
  /// - `f`: A closure that receives a mutable reference to the found doc
  ///
  /// # Returns
  /// - `Ok(R)` if the doc was found and the closure returned `R`
  /// - `Err` if the doc was not found
  ///
  /// # Example
  /// ```ignore
  /// // Add a child to a doc
  /// doc_service.with_doc_mut("js%2Fbasic", |doc| {
  ///   doc.children.push(new_child);
  ///   Self::sort_docs(&mut doc.children);
  /// })?;
  /// ```
  fn find_doc_mut<F, R>(
    docs: &mut Vec<Doc>,
    normalized_path: &str,
    f: F,
  ) -> Result<R, anyhow::Error>
  where
    F: FnOnce(&mut Doc) -> R,
  {
    let mut stack: Vec<&mut Doc> = docs.iter_mut().collect();

    while let Some(doc) = stack.pop() {
      if normalize_path(&doc.path) == normalized_path {
        return Ok(f(doc));
      }
      stack.extend(doc.children.iter_mut());
    }

    Err(anyhow::anyhow!("Doc not found: {}", normalized_path))
  }

  /// Compare two Doc structs for sorting.
  /// Directories come before files, then sorted alphabetically.
  fn compare_docs(a: &Doc, b: &Doc) -> std::cmp::Ordering {
    match (a.is_file, b.is_file) {
      (true, false) => std::cmp::Ordering::Greater,
      (false, true) => std::cmp::Ordering::Less,
      _ => {
        if a.is_file {
          a.id.to_lowercase().cmp(&b.id.to_lowercase())
        } else {
          a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
      }
    }
  }

  /// Sort a vector of Doc structs.
  /// Directories come before files, then sorted alphabetically.
  fn sort_docs(docs: &mut Vec<Doc>) {
    docs.sort_by(Self::compare_docs);
  }

  /// Sorts the children_keys of a parent normalized doc using the same ordering as `sort_docs`.
  fn sort_normalized_childrent_keys(nor_docs: &mut NormalizedDocMap, parent_dir_nor_path: &str) {
    // Now sort parent's children_keys (after inserting the new doc)
    // Collect sorting info first to avoid borrow checker issues
    let sort_info: Vec<(String, bool, String, String)> = {
      let parent_nor_doc = nor_docs.get(parent_dir_nor_path).unwrap();
      parent_nor_doc
        .children_keys
        .iter()
        .filter_map(|k| {
          nor_docs
            .get(k)
            .map(|d| (k.clone(), d.is_file, d.id.clone(), d.name.clone()))
        })
        .collect()
    };
    if let Some(parent_nor_doc) = nor_docs.get_mut(parent_dir_nor_path) {
      parent_nor_doc.children_keys.sort_by(|a, b| {
        let info_a = sort_info.iter().find(|(k, _, _, _)| k == a);
        let info_b = sort_info.iter().find(|(k, _, _, _)| k == b);
        match (info_a, info_b) {
          (Some(info_a), Some(info_b)) => Self::compare_normalized_doc_info(info_a, info_b),
          _ => std::cmp::Ordering::Equal,
        }
      });
    }
  }

  /// Compare normalized doc info tuples for sorting children_keys.
  /// The tuple format is: (key, is_file, id, name)
  fn compare_normalized_doc_info(
    a: &(String, bool, String, String),
    b: &(String, bool, String, String),
  ) -> std::cmp::Ordering {
    let (_, is_file_a, id_a, name_a) = a;
    let (_, is_file_b, id_b, name_b) = b;
    match (*is_file_a, *is_file_b) {
      (true, false) => std::cmp::Ordering::Greater,
      (false, true) => std::cmp::Ordering::Less,
      _ => {
        if *is_file_a {
          id_a.to_lowercase().cmp(&id_b.to_lowercase())
        } else {
          name_a.to_lowercase().cmp(&name_b.to_lowercase())
        }
      }
    }
  }
}
