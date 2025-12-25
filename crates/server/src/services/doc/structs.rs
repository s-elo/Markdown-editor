use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(PartialEq, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Doc {
  pub name: String,
  pub id: String,
  pub is_file: bool,
  pub children: Vec<Doc>,
  pub path: Vec<String>,
  pub headings: Vec<String>,
  pub keywords: Vec<String>,
}

#[derive(PartialEq, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedDoc {
  pub name: String,
  pub id: String,
  pub is_file: bool,
  /// children keys in the normalized docs HashMap
  pub children_keys: Vec<String>,
  pub path: Vec<String>,
  pub headings: Vec<String>,
  pub keywords: Vec<String>,
  /// Parent key in the normalized docs HashMap. None means it's a root doc.
  pub parent_key: Option<String>,
}

pub type NormalizedDocMap = HashMap<String, NormalizedDoc>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Article {
  pub content: String,
  pub file_path: String,
  pub headings: Vec<String>,
  pub keywords: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct GetArticleQuery {
  #[serde(rename = "filePath")]
  pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDocRequest {
  pub file_path: String,
  pub is_file: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateArticleRequest {
  pub file_path: String,
  pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDocNameRequest {
  pub file_path: String,
  pub name: String,
  pub is_file: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyCutDocRequest {
  pub copy_cut_path: String,
  pub paste_path: String,
  pub is_copy: bool,
  pub is_file: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteDocRequest {
  pub file_path: String,
  pub is_file: bool,
}
