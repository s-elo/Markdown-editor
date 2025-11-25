use std::fs;
use std::path::Path;

/// Converts a path array to a percent-encoded normalized path string.
///
/// # Example
/// ```
/// use rs_server::services::doc::normalize_path;
///
/// let path = vec!["js".to_string(), "basic".to_string(), "array".to_string()];
/// assert_eq!(normalize_path(&path), "js%2Fbasic%2Farray");
/// ```
pub fn normalize_path(path_arr: &[String]) -> String {
  percent_encoding::utf8_percent_encode(&path_arr.join("/"), percent_encoding::NON_ALPHANUMERIC)
    .to_string()
}

/// Decodes a percent-encoded normalized path string into a path array.
///
/// # Example
/// ```
/// use rs_server::services::doc::denormalize_path;
///
/// let normalized = "js%2Fbasic%2Farray";
/// let path = denormalize_path(normalized);
/// assert_eq!(path, vec!["js", "basic", "array"]);
/// ```
pub fn denormalize_path(path_str: &str) -> Vec<String> {
  percent_encoding::percent_decode_str(path_str)
    .decode_utf8_lossy()
    .split('/')
    .map(|s| s.to_string())
    .collect()
}

/// Recursively copies a directory and all its contents.
pub fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), anyhow::Error> {
  fs::create_dir_all(dst)?;
  for entry in fs::read_dir(src)? {
    let entry = entry?;
    let path = entry.path();
    let name = entry.file_name();
    let dst_path = dst.join(name);

    if path.is_dir() {
      copy_dir_all(&path, &dst_path)?;
    } else {
      fs::copy(&path, &dst_path)?;
    }
  }
  Ok(())
}
