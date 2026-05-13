use std::fs;
use std::path::PathBuf;

use sysinfo::System;

pub mod system_commands;

/// Get the stored home directory (for service runs)
#[cfg(target_os = "windows")]
fn get_stored_home_dir() -> Option<PathBuf> {
  use winreg::RegKey;
  use winreg::enums::*;

  let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
  let mds_key = hklm.open_subkey("Software\\MarkdownEditorServer").ok()?;

  let home_dir_str: String = mds_key.get_value("HomeDir").ok()?;
  let path = PathBuf::from(home_dir_str);
  if path.exists() { Some(path) } else { None }
}

/// Get the stored git executable path (for service runs)
#[cfg(target_os = "windows")]
fn get_stored_git_exe_path() -> Option<PathBuf> {
  use winreg::RegKey;
  use winreg::enums::*;

  let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
  let mds_key = hklm.open_subkey("Software\\MarkdownEditorServer").ok()?;

  let git_exe_str: String = mds_key.get_value("GitExePath").ok()?;
  let path = PathBuf::from(git_exe_str);
  if path.exists() { Some(path) } else { None }
}

#[cfg(target_os = "windows")]
fn resolve_git_exe_path() -> Option<PathBuf> {
  let output = std::process::Command::new("where.exe")
    .arg("git")
    .output()
    .ok()?;

  if !output.status.success() {
    return None;
  }

  let stdout = String::from_utf8_lossy(&output.stdout);
  stdout
    .lines()
    .map(str::trim)
    .filter(|line| !line.is_empty())
    .map(PathBuf::from)
    .find(|path| path.exists())
}

/// Store the interactive user's launch context so the Windows service can
/// recreate the expected profile environment when it runs as LocalSystem.
#[cfg(target_os = "windows")]
pub fn store_service_launch_context() -> Result<(), anyhow::Error> {
  use anyhow::Context;
  use winreg::RegKey;
  use winreg::enums::*;

  let home = dirs::home_dir().context("Could not find home directory")?;
  let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
  let (mds_key, _) = hklm
    .create_subkey("Software\\MarkdownEditorServer")
    .context("Failed to create MarkdownEditorServer registry key")?;

  mds_key
    .set_value("HomeDir", &home.to_string_lossy().to_string())
    .context("Failed to store service home directory")?;

  if let Some(git_exe_path) = resolve_git_exe_path() {
    mds_key
      .set_value("GitExePath", &git_exe_path.to_string_lossy().to_string())
      .context("Failed to store git executable path")?;
  } else {
    let _ = mds_key.delete_value("GitExePath");
  }

  Ok(())
}

#[cfg(target_os = "windows")]
fn set_process_env<K, V>(key: K, value: V)
where
  K: AsRef<std::ffi::OsStr>,
  V: AsRef<std::ffi::OsStr>,
{
  // This is called from the Windows service entrypoint before the Tokio
  // runtime starts, so no other Rust threads are reading the environment yet.
  unsafe {
    std::env::set_var(key, value);
  }
}

/// Configure the Windows service process to see the interactive user's profile.
#[cfg(target_os = "windows")]
pub fn configure_service_user_profile_env() -> Result<(), anyhow::Error> {
  use anyhow::Context;

  let home = get_stored_home_dir().context("Stored service home directory was not found")?;

  set_process_env("HOME", home.as_os_str());
  set_process_env("USERPROFILE", home.as_os_str());

  if let Some(home_str) = home.to_str() {
    if home_str.len() >= 3 && home_str.as_bytes().get(1) == Some(&b':') {
      set_process_env("HOMEDRIVE", &home_str[..2]);
      set_process_env("HOMEPATH", &home_str[2..]);
    }
  }

  set_process_env("APPDATA", home.join("AppData").join("Roaming").as_os_str());
  set_process_env(
    "LOCALAPPDATA",
    home.join("AppData").join("Local").as_os_str(),
  );

  if let Some(git_exe_path) = get_stored_git_exe_path() {
    set_process_env("MDS_GIT_EXE_PATH", git_exe_path.as_os_str());

    if let Some(git_dir) = git_exe_path.parent() {
      let git_dir_str = git_dir.to_string_lossy();
      let current_path = std::env::var("PATH").unwrap_or_default();
      let has_git_dir = current_path
        .split(';')
        .any(|entry| entry.eq_ignore_ascii_case(git_dir_str.as_ref()));

      if !has_git_dir {
        let new_path = if current_path.is_empty() {
          git_dir_str.to_string()
        } else {
          format!("{};{}", git_dir_str, current_path)
        };
        set_process_env("PATH", new_path);
      }
    }
  }

  Ok(())
}

/// Get the app data directory in user's home (for release builds)
pub fn app_data_dir() -> PathBuf {
  #[cfg(not(debug_assertions))]
  let data_path = PathBuf::from(".md-server");
  #[cfg(debug_assertions)]
  let data_path = PathBuf::from(".md-server-dev");

  #[cfg(target_os = "windows")]
  {
    if let Some(home) = get_stored_home_dir() {
      return home.join(data_path);
    }
  }

  dirs::home_dir()
    .unwrap_or_else(|| PathBuf::from("."))
    .join(data_path)
}

/// Read PID from file
pub fn read_pid_file(path: &PathBuf) -> Option<u32> {
  fs::read_to_string(path)
    .ok()
    .and_then(|s| s.trim().parse().ok())
}

/// Check if a process with the given PID is running
pub fn is_process_running(pid: u32) -> bool {
  let mut sys = System::new();
  sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
  sys.process(sysinfo::Pid::from_u32(pid)).is_some()
}

#[cfg(target_os = "windows")]
/// Get the PID of the Windows service if it's running
pub fn get_service_pid() -> Option<u32> {
  use crate::utils::system_commands::query_windows_service_ex;

  let output = query_windows_service_ex("MarkdownEditorServer").ok()?;

  if !output.status.success() {
    return None;
  }

  let stdout = String::from_utf8_lossy(&output.stdout);

  let is_running = stdout.contains("STATE              : 4  RUNNING");
  if !is_running {
    return None;
  }

  for line in stdout.lines() {
    if line.trim().starts_with("PID") {
      if let Some(pid_str) = line.split(':').nth(1) {
        if let Ok(pid) = pid_str.trim().parse::<u32>() {
          if pid > 0 {
            return Some(pid);
          }
        }
      }
    }
  }

  None
}

/// Get the service PID using sc queryex and write it to the PID file
#[cfg(target_os = "windows")]
pub fn get_and_write_service_pid(pid_file: &PathBuf) -> Result<(), anyhow::Error> {
  let pid = get_service_pid().unwrap_or(0);

  if pid > 0 {
    if let Some(parent) = pid_file.parent() {
      fs::create_dir_all(parent)?;
    } else {
      println!(
        "Warning: Could not determine parent directory for PID file: {}",
        pid_file.display()
      );
    }
    match fs::write(pid_file, pid.to_string()) {
      Ok(_) => {
        println!("Wrote service PID {} to file {}", pid, pid_file.display());
      }
      Err(e) => {
        println!(
          "Warning: Could not write PID to file {}: {}",
          pid_file.display(),
          e
        );
      }
    }
  }

  Ok(())
}

/// Get the real path for the symlink case
pub fn get_real_executable_path() -> Result<PathBuf, anyhow::Error> {
  let exe_path = std::env::current_exe()?;
  let actual_path = std::fs::canonicalize(&exe_path)?;
  Ok(actual_path)
}

/// Resolve the bundled client directory relative to the current executable.
/// - macOS .app bundle: `{exe_dir}/../Resources/client/`
/// - Windows / general: `{exe_dir}/client/`
pub fn resolve_client_dir() -> Option<PathBuf> {
  let exe_path = std::env::current_exe().ok()?;
  let exe_dir = exe_path.parent()?;

  // macOS .app bundle: binary is at Contents/MacOS/mds, client at Contents/Resources/client
  let macos_client = exe_dir.join("../Resources/client");
  if macos_client.is_dir() {
    return Some(macos_client.canonicalize().unwrap_or(macos_client));
  }

  // General case: client/ alongside the binary
  let sibling_client = exe_dir.join("client");
  if sibling_client.is_dir() {
    return Some(sibling_client.canonicalize().unwrap_or(sibling_client));
  }

  None
}
