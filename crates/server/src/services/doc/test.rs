#[cfg(test)]
mod tests {
  use crate::services::doc::{DocService, denormalize_path, normalize_path};
  use crate::services::settings::{Settings, SettingsService};
  use std::{
    fs,
    sync::{Arc, Mutex},
  };

  /// Creates a temporary directory and returns a DocService instance configured to use it.
  fn setup_test_service() -> (DocService, tempfile::TempDir) {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp directory");
    let settings = Settings {
      doc_root_path: temp_dir.path().to_path_buf(),
      ignore_dirs: vec![".git".to_string(), "node_modules".to_string()],
    };

    let settings_service = SettingsService {
      settings: Arc::new(Mutex::new(settings)),
      editor_settings_file: temp_dir.path().join("editor-settings.json"),
    };

    let doc_service = DocService::new(Arc::new(settings_service));
    (doc_service, temp_dir)
  }

  mod init_and_create {
    use super::*;

    #[test]
    fn test_get_sub_doc_items() {
      let (service, _temp_dir) = setup_test_service();
      let docs = service.get_sub_doc_items("", false).unwrap();
      assert!(docs.is_empty());
    }

    #[test]
    fn test_create_file() {
      let (service, _temp_dir) = setup_test_service();
      let doc_path = "test-file";

      let doc = service.create_doc(doc_path, true).unwrap();
      assert_eq!(doc.name, "test-file");
      assert!(doc.is_file);
      assert_eq!(doc.path, vec!["test-file"]);

      // Verify file exists on filesystem
      let fs_path = service.path_convertor(doc_path, true).unwrap();
      assert!(fs_path.exists());
      assert!(fs_path.is_file());
      assert_eq!(fs_path.extension().unwrap(), "md");
    }

    #[test]
    fn test_create_directory() {
      let (service, _temp_dir) = setup_test_service();
      let doc_path = "test-dir";

      let doc = service.create_doc(doc_path, false).unwrap();
      assert_eq!(doc.name, "test-dir");
      assert!(!doc.is_file);
      assert_eq!(doc.path, vec!["test-dir"]);

      // Verify directory exists on filesystem
      let fs_path = service.path_convertor(doc_path, false).unwrap();
      assert!(fs_path.exists());
      assert!(fs_path.is_dir());
    }

    #[test]
    fn test_create_nested_file() {
      let (service, _temp_dir) = setup_test_service();
      // Create parent directories first
      service.create_doc("parent", false).unwrap();
      service.create_doc("parent%2Fchild", false).unwrap();

      let doc_path = "parent%2Fchild%2Ffile";
      let doc = service.create_doc(doc_path, true).unwrap();
      assert_eq!(doc.name, "file");
      assert_eq!(doc.path, vec!["parent", "child", "file"]);

      // Verify nested structure exists
      let fs_path = service.path_convertor(doc_path, true).unwrap();
      assert!(fs_path.exists());
      assert!(fs_path.parent().unwrap().exists());
    }
  }

  mod delete {
    use super::*;

    #[test]
    fn test_delete_file() {
      let (service, _temp_dir) = setup_test_service();
      let doc_path = "test-file";

      // Create file first
      service.create_doc(doc_path, true).unwrap();
      let fs_path = service.path_convertor(doc_path, true).unwrap();
      assert!(fs_path.exists());

      // Delete file
      service.delete_doc(doc_path, true).unwrap();
      assert!(!fs_path.exists());
    }

    #[test]
    fn test_delete_directory() {
      let (service, _temp_dir) = setup_test_service();
      let doc_path = "test-dir";

      // Create directory with a file
      service.create_doc(doc_path, false).unwrap();
      service.create_doc("test-dir%2Ffile", true).unwrap();

      let fs_path = service.path_convertor(doc_path, false).unwrap();
      assert!(fs_path.exists());

      // Delete directory
      service.delete_doc(doc_path, false).unwrap();
      assert!(!fs_path.exists());
    }
  }

  mod article {
    use super::*;

    #[test]
    fn test_update_article() {
      let (service, _temp_dir) = setup_test_service();
      let doc_path = "test-article";
      let content = "# Hello World\n\nThis is a test article.";

      // Create file first
      service.create_doc(doc_path, true).unwrap();

      // Update article
      service.update_article(doc_path, content).unwrap();

      // Verify content
      let article = service.get_article(doc_path).unwrap().unwrap();
      assert_eq!(article.content, content);
      assert_eq!(article.file_path, doc_path);
    }

    #[test]
    fn test_update_article_creates_parent_dirs() {
      let (service, _temp_dir) = setup_test_service();
      let doc_path = normalize_path(&vec![
        "nested".to_string(),
        "deep".to_string(),
        "article".to_string(),
      ]);
      let content = "# Nested Article";

      // Update article without creating parent dirs first
      service.update_article(&doc_path, content).unwrap();

      // Verify file and parent directories exist
      let fs_path = service.path_convertor(&doc_path, true).unwrap();
      assert!(fs_path.exists());
      assert!(fs_path.parent().unwrap().exists());
    }

    #[test]
    fn test_get_article_nonexistent() {
      let (service, _temp_dir) = setup_test_service();
      let result = service.get_article("nonexistent").unwrap();
      assert!(result.is_none());
    }

    #[test]
    fn test_get_article_existing() {
      let (service, _temp_dir) = setup_test_service();
      let doc_path = "test-article";
      let content = "# Test\n\nContent here.";

      service.create_doc(doc_path, true).unwrap();
      service.update_article(doc_path, content).unwrap();

      let article = service.get_article(doc_path).unwrap().unwrap();
      assert_eq!(article.content, content);
    }
  }

  mod copy_cut {
    use super::*;

    #[test]
    fn test_copy_file() {
      let (service, _temp_dir) = setup_test_service();
      let source_path = "source-file";
      let dest_path = "dest-file";
      let content = "# Source Content";

      // Create source file
      service.create_doc(source_path, true).unwrap();
      service.update_article(source_path, content).unwrap();

      // Copy file
      service
        .copy_cut_doc(source_path, dest_path, true, true)
        .unwrap();

      // Verify both files exist
      let source_fs = service.path_convertor(source_path, true).unwrap();
      let dest_fs = service.path_convertor(dest_path, true).unwrap();
      assert!(source_fs.exists());
      assert!(dest_fs.exists());

      // Verify content is copied
      let dest_article = service.get_article(dest_path).unwrap().unwrap();
      assert_eq!(dest_article.content, content);
    }

    #[test]
    fn test_move_file() {
      let (service, _temp_dir) = setup_test_service();
      let source_path = "source-file";
      let dest_path = "dest-file";
      let content = "# Source Content";

      // Create source file
      service.create_doc(source_path, true).unwrap();
      service.update_article(source_path, content).unwrap();

      // Move file
      service
        .copy_cut_doc(source_path, dest_path, false, true)
        .unwrap();

      // Verify source is gone and dest exists
      let source_fs = service.path_convertor(source_path, true).unwrap();
      let dest_fs = service.path_convertor(dest_path, true).unwrap();
      assert!(!source_fs.exists());
      assert!(dest_fs.exists());

      // Verify content is moved
      let dest_article = service.get_article(dest_path).unwrap().unwrap();
      assert_eq!(dest_article.content, content);
    }

    #[test]
    fn test_copy_directory() {
      let (service, _temp_dir) = setup_test_service();
      let source_path = "source-dir";
      let dest_path = "dest-dir";
      let file_path = normalize_path(&vec!["source-dir".to_string(), "file".to_string()]);
      let content = "# File Content";

      // Create source directory with file
      service.create_doc(source_path, false).unwrap();
      service.create_doc(&file_path, true).unwrap();
      service.update_article(&file_path, content).unwrap();

      // Copy directory
      service
        .copy_cut_doc(source_path, dest_path, true, false)
        .unwrap();

      // Verify both directories exist
      let source_fs = service.path_convertor(source_path, false).unwrap();
      let dest_fs = service.path_convertor(dest_path, false).unwrap();
      assert!(source_fs.exists());
      assert!(dest_fs.exists());

      // Verify file in copied directory
      let dest_file_path = normalize_path(&vec!["dest-dir".to_string(), "file".to_string()]);
      let dest_article = service.get_article(&dest_file_path).unwrap().unwrap();
      assert_eq!(dest_article.content, content);
    }

    #[test]
    fn test_copy_cut_invalid_parent_path() {
      let (service, _temp_dir) = setup_test_service();
      let source_path = "source-file";
      let invalid_dest = normalize_path(&vec![
        "nonexistent".to_string(),
        "parent".to_string(),
        "dest".to_string(),
      ]);

      service.create_doc(source_path, true).unwrap();

      // Should fail because parent doesn't exist
      let result = service.copy_cut_doc(source_path, &invalid_dest, true, true);
      assert!(result.is_err());
    }
  }

  mod rename {
    use super::*;

    #[test]
    fn test_rename_file() {
      let (service, _temp_dir) = setup_test_service();
      let old_path = "old-file";
      let new_name = "new-file";
      let content = "# Content";

      // Create file on filesystem
      let fs_path = service.path_convertor(old_path, true).unwrap();
      if let Some(parent) = fs_path.parent() {
        fs::create_dir_all(parent).unwrap();
      }
      fs::File::create(&fs_path).unwrap();
      service.update_article(old_path, content).unwrap();

      let docs = service.get_sub_doc_items("", false).unwrap();
      assert_eq!(docs.len(), 1);
      let actual_old_path = normalize_path(&docs[0].path);

      // Rename file using the actual normalized path from cache
      service
        .modify_name(&actual_old_path, new_name, true)
        .unwrap();

      // Verify old path doesn't exist, new path exists
      let old_fs = service.path_convertor(&actual_old_path, true).unwrap();
      let new_path = normalize_path(&vec![new_name.to_string()]);
      let new_fs = service.path_convertor(&new_path, true).unwrap();
      assert!(!old_fs.exists());
      assert!(new_fs.exists());

      // Verify content is preserved
      let article = service.get_article(&new_path).unwrap().unwrap();
      assert_eq!(article.content, content);
    }

    #[test]
    fn test_rename_directory() {
      let (service, _temp_dir) = setup_test_service();
      let old_path = "old-dir";
      let new_name = "new-dir";
      let file_path = normalize_path(&vec!["old-dir".to_string(), "file".to_string()]);
      let content = "# File Content";

      // Create directory with file on filesystem
      service.create_doc(old_path, false).unwrap();
      service.create_doc(&file_path, true).unwrap();
      service.update_article(&file_path, content).unwrap();

      let docs = service.get_sub_doc_items("", false).unwrap();
      assert_eq!(docs.len(), 1);

      // Rename directory using the actual normalized path from cache
      service.modify_name(old_path, new_name, false).unwrap();

      // Verify old path doesn't exist, new path exists
      let old_fs = service.path_convertor(old_path, false).unwrap();
      let new_fs = service.path_convertor(new_name, false).unwrap();
      assert!(!old_fs.exists());
      assert!(new_fs.exists());

      // Verify file in renamed directory
      let new_file_path = normalize_path(&vec!["new-dir".to_string(), "file".to_string()]);
      let article = service.get_article(&new_file_path).unwrap().unwrap();
      assert_eq!(article.content, content);
    }

    #[test]
    fn test_rename_same_name_no_op() {
      let (service, _temp_dir) = setup_test_service();
      let doc_path = "test-file";
      let content = "# Content";

      service.create_doc(doc_path, true).unwrap();
      service.update_article(doc_path, content).unwrap();

      // Rename to same name should be a no-op
      service.modify_name(doc_path, "test-file", true).unwrap();

      // Verify file still exists with same content
      let article = service.get_article(doc_path).unwrap().unwrap();
      assert_eq!(article.content, content);
    }

    #[test]
    fn test_modify_name_nonexistent_file() {
      let (service, _temp_dir) = setup_test_service();
      // Should not error, just return Ok(())
      let result = service.modify_name("nonexistent", "new-name", true);
      assert!(result.is_ok());
    }
  }

  #[test]
  fn test_get_docs_with_cache() {
    let (service, _temp_dir) = setup_test_service();
    let doc_path = "test-file";

    // First call should scan filesystem
    service.create_doc(doc_path, true).unwrap();
    let docs1 = service.get_sub_doc_items("", false).unwrap();
    assert_eq!(docs1.len(), 1);

    // Second call should use cache
    let docs2 = service.get_sub_doc_items("", false).unwrap();
    assert_eq!(docs2.len(), 1);
    assert_eq!(docs1[0].id, docs2[0].id);
  }

  #[test]
  fn test_get_docs_force_refresh() {
    let (service, _temp_dir) = setup_test_service();
    let doc_path = "test-file";

    service.create_doc(doc_path, true).unwrap();
    let docs1 = service.get_sub_doc_items("", false).unwrap();
    assert_eq!(docs1.len(), 1);

    // Create another file directly on filesystem
    let another_path = service.path_convertor("another-file", true).unwrap();
    fs::write(&another_path, "").unwrap();

    // Force refresh should pick up new file
    let docs2 = service.get_sub_doc_items("", false).unwrap();
    assert_eq!(docs2.len(), 2);
  }

  #[test]
  fn test_refresh_doc() {
    let (service, _temp_dir) = setup_test_service();
    let doc_path = "test-file";

    service.create_doc(doc_path, true).unwrap();

    // Create another file directly on filesystem
    let another_path = service.path_convertor("another-file", true).unwrap();
    fs::write(&another_path, "").unwrap();

    let docs = service.get_sub_doc_items("", false).unwrap();
    assert_eq!(docs.len(), 2);
  }

  #[test]
  fn test_ignore_directories() {
    let (service, _temp_dir) = setup_test_service();
    let temp_dir_path = service.doc_root_path.lock().unwrap().clone();

    // Create ignored directory
    let ignored_dir = temp_dir_path.join(".git");
    fs::create_dir_all(&ignored_dir).unwrap();
    fs::write(ignored_dir.join("file.md"), "").unwrap();

    // Create non-ignored directory
    service.create_doc("visible-dir", false).unwrap();
    service.create_doc("visible-dir%2Ffile", true).unwrap();

    let docs = service.get_sub_doc_items("", false).unwrap();
    // Should only see visible-dir, not .git
    assert_eq!(docs.len(), 1);
    assert_eq!(docs[0].name, "visible-dir");
  }

  #[test]
  fn test_nested_structure() {
    let (service, _temp_dir) = setup_test_service();
    let dir_path = "parent";
    let child_path = "parent%2Fchild";
    let file_path = "parent%2Fchild%2Ffile";

    service.create_doc(dir_path, false).unwrap();
    service.create_doc(child_path, false).unwrap();
    service.create_doc(file_path, true).unwrap();

    let docs = service.get_sub_doc_items("", false).unwrap();
    assert_eq!(docs.len(), 1);
    assert_eq!(docs[0].name, "parent");
    let sub_doc_items = service.get_sub_doc_items(dir_path, false).unwrap();
    assert_eq!(sub_doc_items.len(), 1);
    assert_eq!(sub_doc_items[0].name, "child");
    let sub_doc_items = service.get_sub_doc_items(child_path, false).unwrap();
    assert_eq!(sub_doc_items.len(), 1);
    assert_eq!(sub_doc_items[0].name, "file");
  }

  #[test]
  fn test_sorting_directories_before_files() {
    let (service, _temp_dir) = setup_test_service();
    service.create_doc("z-file", true).unwrap();
    service.create_doc("a-dir", false).unwrap();
    service.create_doc("m-file", true).unwrap();
    service.create_doc("b-dir", false).unwrap();

    let docs = service.get_sub_doc_items("", false).unwrap();
    assert_eq!(docs.len(), 4);
    // Directories should come first
    assert_eq!(docs[0].name, "a-dir");
    assert!(!docs[0].is_file);
    assert_eq!(docs[1].name, "b-dir");
    assert!(!docs[1].is_file);
    // Then files
    assert_eq!(docs[2].name, "m-file");
    assert!(docs[2].is_file);
    assert_eq!(docs[3].name, "z-file");
    assert!(docs[3].is_file);
  }

  #[test]
  fn test_path_normalization() {
    let path = vec!["js".to_string(), "basic".to_string(), "array".to_string()];
    let normalized = normalize_path(&path);
    assert_eq!(normalized, "js%2Fbasic%2Farray");

    let denormalized = denormalize_path(&normalized);
    assert_eq!(denormalized, path);
  }

  #[test]
  fn test_sync_settings() {
    let (service, temp_dir) = setup_test_service();
    let new_settings = Settings {
      doc_root_path: temp_dir.path().join("new-docs"),
      ignore_dirs: vec!["custom-ignore".to_string()],
    };

    fs::create_dir_all(&new_settings.doc_root_path).unwrap();
    fs::write(new_settings.doc_root_path.join("file.md"), "").unwrap();

    service.sync_settings(&new_settings);

    // Verify settings are updated
    let ignore_dirs = service.ignore_dirs.lock().unwrap();
    assert_eq!(ignore_dirs.len(), 1);
    assert_eq!(ignore_dirs[0], "custom-ignore");
  }
}
