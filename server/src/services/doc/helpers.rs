use percent_encoding::{AsciiSet, CONTROLS};
use std::fs;
use std::path::Path;

/// ASCII set that matches JavaScript's `encodeURIComponent` behavior.
/// Encodes everything except unreserved characters: A-Z, a-z, 0-9, -, ., _, ~
/// This is equivalent to JavaScript's encodeURIComponent.
pub const ENCODE_URI_COMPONENT: &AsciiSet = &CONTROLS
  .add(b' ')
  .add(b'!')
  .add(b'"')
  .add(b'#')
  .add(b'$')
  .add(b'%')
  .add(b'&')
  .add(b'\'')
  .add(b'(')
  .add(b')')
  .add(b'*')
  .add(b'+')
  .add(b',')
  .add(b'/')
  .add(b':')
  .add(b';')
  .add(b'<')
  .add(b'=')
  .add(b'>')
  .add(b'?')
  .add(b'@')
  .add(b'[')
  .add(b'\\')
  .add(b']')
  .add(b'^')
  .add(b'`')
  .add(b'{')
  .add(b'|')
  .add(b'}');

/// Converts a path array to a percent-encoded normalized path string.
/// Uses the same encoding as JavaScript's `encodeURIComponent`.
///
/// # Example
/// ```
/// use rs_server::services::doc::normalize_path;
///
/// let path = vec!["js".to_string(), "basic".to_string(), "array".to_string()];
/// assert_eq!(normalize_path(&path), "js%2Fbasic%2Farray");
/// ```
pub fn normalize_path(path_arr: &[String]) -> String {
  percent_encoding::utf8_percent_encode(&path_arr.join("/"), ENCODE_URI_COMPONENT).to_string()
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

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_normalize_path_encodes_slash() {
    let path = vec!["js".to_string(), "basic".to_string(), "array".to_string()];
    let result = normalize_path(&path);
    // Slash should be encoded as %2F
    assert_eq!(result, "js%2Fbasic%2Farray");
  }

  #[test]
  fn test_normalize_path_preserves_unreserved_chars() {
    // Unreserved characters: A-Z, a-z, 0-9, -, ., _, ~
    let path = vec!["test-file_123".to_string(), "dir.name~".to_string()];
    let result = normalize_path(&path);
    // These characters should NOT be encoded
    assert!(result.contains("test-file_123"));
    assert!(result.contains("dir.name~"));
    // But slash should be encoded
    assert!(result.contains("%2F"));
  }

  #[test]
  fn test_normalize_path_encodes_special_chars() {
    // Characters that should be encoded
    let path = vec!["file with spaces".to_string(), "file#name".to_string()];
    let result = normalize_path(&path);
    // Space should be encoded as %20
    assert!(result.contains("%20"));
    // # should be encoded as %23
    assert!(result.contains("%23"));
  }

  #[test]
  fn test_normalize_denormalize_roundtrip() {
    let original = vec!["js".to_string(), "basic".to_string(), "array".to_string()];
    let normalized = normalize_path(&original);
    let denormalized = denormalize_path(&normalized);
    assert_eq!(original, denormalized);
  }

  #[test]
  fn test_normalize_path_matches_encodeuricomponent_behavior() {
    // Test cases that verify we match JavaScript's encodeURIComponent
    // These are the unreserved characters that should NOT be encoded
    let unreserved = vec!["ABC".to_string(), "xyz".to_string(), "123".to_string()];
    let result = normalize_path(&unreserved);
    assert_eq!(result, "ABC%2Fxyz%2F123"); // Only / is encoded

    // Test with all unreserved chars in one segment
    let path = vec!["A-Z_a-z0-9.-~".to_string()];
    let result = normalize_path(&path);
    // All characters should remain unencoded (except / which isn't in this path)
    assert_eq!(result, "A-Z_a-z0-9.-~");
  }
}
