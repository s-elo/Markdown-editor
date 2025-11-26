use percent_encoding::utf8_percent_encode;

use crate::services::doc::helpers::ENCODE_URI_COMPONENT;

/// Encodes a file path if it contains characters that need encoding (per ENCODE_URI_COMPONENT).
/// Uses the same encoding logic as `normalize_path` in helpers.rs.
/// If the path is already encoded, it will be returned as-is to prevent double-encoding.
///
/// # Arguments
/// * `path` - The path string that may or may not be encoded
///
/// # Returns
/// A normalized (percent-encoded) path string if encoding is needed, otherwise the original path
///
/// # Example
/// ```
/// use rs_server::utils::path_encoding::encode_path_string;
///
/// // Path with '/' gets encoded
/// assert_eq!(encode_path_string("js/basic/array"), "js%2Fbasic%2Farray");
///
/// // Already encoded path stays as-is (no double encoding)
/// assert_eq!(encode_path_string("js%2Fbasic%2Farray"), "js%2Fbasic%2Farray");
///
/// // Path without characters needing encoding stays as-is
/// assert_eq!(encode_path_string("array"), "array");
///
/// // Path with special characters gets encoded
/// assert_eq!(encode_path_string("file with spaces"), "file%20with%20spaces");
/// ```
pub fn encode_path_string(path: &str) -> String {
  // Check if path contains any characters that need encoding according to ENCODE_URI_COMPONENT
  // ENCODE_URI_COMPONENT encodes: controls, space, ! " # $ % & ' ( ) * + , / : ; < = > ? @ [ \ ] ^ ` { | }
  // Unreserved chars that don't need encoding: A-Z, a-z, 0-9, -, ., _, ~
  let needs_encoding = path.bytes().any(|b| {
    matches!(
      b,
      // Control characters (0x00-0x1F, 0x7F)
      0x00
        ..=0x1F | 0x7F |
      // Characters encoded by ENCODE_URI_COMPONENT
      b' ' | b'!' | b'"' | b'#' | b'$' | b'%' | b'&' | b'\'' | b'(' | b')' | b'*' | b'+' | b',' |
      b'/' | b':' | b';' | b'<' | b'=' | b'>' | b'?' | b'@' | b'[' | b'\\' | b']' | b'^' | b'`' |
      b'{' | b'|' | b'}'
    )
  });

  if needs_encoding {
    utf8_percent_encode(path, ENCODE_URI_COMPONENT).to_string()
  } else {
    path.to_string()
  }
}
