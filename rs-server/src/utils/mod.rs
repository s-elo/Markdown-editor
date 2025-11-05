use std::env;
use std::path::PathBuf;

pub fn project_root(paths: &[&'static str]) -> PathBuf {
  let mut cwd = PathBuf::from(env::current_dir().unwrap()).join("..");
  cwd.extend(paths);
  cwd
}

pub fn cwd(paths: &[&'static str]) -> PathBuf {
  let mut cwd = PathBuf::from(env::current_exe().unwrap());
  cwd.extend(paths);
  cwd
}
