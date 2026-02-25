use std::{
  fs,
  path::{Path, PathBuf},
  sync::Arc,
};

use sha2::{Digest, Sha256};

use crate::services::settings::SettingsService;

const ASSETS_DIR: &str = "_assets";

pub struct ImgService {
  settings_service: Arc<SettingsService>,
}

impl ImgService {
  pub fn new(settings_service: Arc<SettingsService>) -> Self {
    Self { settings_service }
  }

  /// Reads an image from the doc workspace by relative path.
  /// Returns (bytes, mime_type).
  pub fn get_image(&self, img_path: &str) -> Result<(Vec<u8>, String), anyhow::Error> {
    let settings = self.settings_service.get_settings();
    let full_path = settings.doc_root_path.join(img_path);

    if !full_path.exists() {
      return Err(anyhow::anyhow!("Image not found: {}", img_path));
    }

    // Prevent directory traversal
    if !full_path.starts_with(&settings.doc_root_path) {
      return Err(anyhow::anyhow!("Invalid image path"));
    }

    let bytes = fs::read(&full_path)?;
    let mime = Self::infer_mime(&full_path);

    Ok((bytes, mime))
  }

  /// Saves an uploaded image to `{doc_root}/_assets/{hash}.{ext}`.
  /// Uses SHA-256 content hash (first 16 hex chars) for deduplication:
  /// - Same content already exists: returns existing path without writing.
  /// - Hash collision with different content: appends `_1`, `_2`, etc.
  pub fn upload_image(&self, file_name: &str, data: &[u8]) -> Result<String, anyhow::Error> {
    let settings = self.settings_service.get_settings();
    let assets_dir = settings.doc_root_path.join(ASSETS_DIR);

    fs::create_dir_all(&assets_dir)?;

    let ext = Self::infer_extension(file_name, data);
    let hash = Self::content_hash(data);
    let dest_name = Self::resolve_hash_name(&assets_dir, &hash, ext, data)?;
    let rel_url = format!("/{}/{}", ASSETS_DIR, dest_name);

    Ok(rel_url)
  }

  fn content_hash(data: &[u8]) -> String {
    let digest = Sha256::digest(data);
    digest[..8].iter().map(|b| format!("{:02x}", b)).collect()
  }

  /// Finds the correct filename for the given hash:
  /// - If no file with this hash exists, writes `{hash}.{ext}` and returns it.
  /// - If a file exists with identical content, returns the existing name (dedup).
  /// - If a file exists with different content (hash collision), tries `{hash}_1`, `{hash}_2`, etc.
  fn resolve_hash_name(
    assets_dir: &Path,
    hash: &str,
    ext: &str,
    data: &[u8],
  ) -> Result<String, anyhow::Error> {
    let base_name = format!("{}.{}", hash, ext);
    let base_path = assets_dir.join(&base_name);

    if !base_path.exists() {
      fs::write(&base_path, data)?;
      tracing::info!("[ImgService] Saved image: {}", base_path.display());
      return Ok(base_name);
    }

    if Self::file_content_matches(&base_path, data)? {
      tracing::info!("[ImgService] Dedup hit: {}", base_path.display());
      return Ok(base_name);
    }

    for i in 1u32.. {
      let candidate_name = format!("{}_{}.{}", hash, i, ext);
      let candidate_path = assets_dir.join(&candidate_name);

      if !candidate_path.exists() {
        fs::write(&candidate_path, data)?;
        tracing::info!(
          "[ImgService] Saved image (collision): {}",
          candidate_path.display()
        );
        return Ok(candidate_name);
      }

      if Self::file_content_matches(&candidate_path, data)? {
        tracing::info!("[ImgService] Dedup hit: {}", candidate_path.display());
        return Ok(candidate_name);
      }
    }

    unreachable!()
  }

  fn file_content_matches(path: &PathBuf, data: &[u8]) -> Result<bool, anyhow::Error> {
    let existing = fs::read(path)?;
    Ok(existing == data)
  }

  /// Infers file extension from client filename if valid, else from content magic bytes.
  fn infer_extension(file_name: &str, data: &[u8]) -> &'static str {
    let path = Path::new(file_name);
    if let Some(ext) = path.extension() {
      let ext = ext.to_string_lossy().to_lowercase();
      if matches!(
        ext.as_str(),
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "ico" | "bmp" | "avif"
      ) {
        return match ext.as_str() {
          "jpg" | "jpeg" => "jpg",
          "png" => "png",
          "gif" => "gif",
          "webp" => "webp",
          "svg" => "svg",
          "ico" => "ico",
          "bmp" => "bmp",
          "avif" => "avif",
          _ => Self::infer_extension_from_magic_bytes(data),
        };
      }
    }
    Self::infer_extension_from_magic_bytes(data)
  }

  /// Infers extension from image magic bytes (for pasted images with no extension).
  fn infer_extension_from_magic_bytes(data: &[u8]) -> &'static str {
    if data.len() < 12 {
      return "png"; // fallback
    }
    if data[0..8] == [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] {
      return "png";
    }
    if data.len() >= 3 && data[0..3] == [0xFF, 0xD8, 0xFF] {
      return "jpg";
    }
    if data.len() >= 6 && (data.starts_with(b"GIF87a") || data.starts_with(b"GIF89a")) {
      return "gif";
    }
    if data.len() >= 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
      return "webp";
    }
    if data.len() >= 5 && data[0] == b'<' && (&data[1..4] == b"svg" || &data[1..5] == b"?xml") {
      return "svg";
    }
    "png" // fallback
  }

  fn infer_mime(path: &Path) -> String {
    let ext = path
      .extension()
      .and_then(|e| e.to_str())
      .unwrap_or("")
      .to_lowercase();

    match ext.as_str() {
      "png" => "image/png",
      "jpg" | "jpeg" => "image/jpeg",
      "gif" => "image/gif",
      "webp" => "image/webp",
      "svg" => "image/svg+xml",
      "ico" => "image/x-icon",
      "bmp" => "image/bmp",
      "avif" => "image/avif",
      _ => "application/octet-stream",
    }
    .to_string()
  }
}
