use std::fs;
#[cfg(target_os = "macos")]
use std::path::Path;
use std::path::PathBuf;

use sysinfo::System;

pub mod system_commands;

/// Get the stored home directory (for service runs)
/// This is used by the Windows service to use the same home directory as the user who installed it
#[cfg(target_os = "windows")]
fn get_stored_home_dir() -> Option<PathBuf> {
  use winreg::RegKey;
  use winreg::enums::*;

  // Access HKEY_LOCAL_MACHINE for system-wide service access
  let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
  let mds_key = hklm.open_subkey("Software\\MarkdownEditorServer").ok()?;

  let home_dir_str: String = mds_key.get_value("HomeDir").ok()?;
  let path = PathBuf::from(home_dir_str);
  if path.exists() { Some(path) } else { None }
}

/// Store the home directory for the service to use later
#[cfg(target_os = "windows")]
pub fn store_home_dir(home_dir: &PathBuf) -> std::io::Result<()> {
  use winreg::RegKey;
  use winreg::enums::*;

  // Store in HKEY_LOCAL_MACHINE so the service (running as SYSTEM) can access it
  let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
  let (mds_key, _disp) = hklm
    .create_subkey("Software\\MarkdownEditorServer")
    .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

  mds_key
    .set_value("HomeDir", &home_dir.to_string_lossy().as_ref())
    .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

  Ok(())
}

/// Get the app data directory in user's home (for release builds)
/// Falls back to "." if home directory cannot be determined
pub fn app_data_dir() -> PathBuf {
  #[cfg(not(debug_assertions))]
  let data_path = PathBuf::from(".md-server");
  #[cfg(debug_assertions)]
  let data_path = PathBuf::from(".md-server-dev");

  // On Windows, try to use the stored home directory first (for service runs)
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

/// Remove the export line from a shell config file
#[cfg(target_os = "macos")]
pub fn remove_from_shell_config(
  file_path: &Path,
  _install_dir: &Path,
) -> Result<(), anyhow::Error> {
  use std::io::Write;
  use std::io::{BufRead, BufReader};

  if !file_path.exists() {
    return Ok(());
  }

  let file = fs::File::open(file_path)?;
  let reader = BufReader::new(file);
  let mut lines: Vec<String> = Vec::new();
  let mut found = false;
  let mut skip_next = false;

  for line in reader.lines() {
    let line = line?;

    // Skip the comment and the export line
    if line.contains("# Markdown Editor Server") {
      found = true;
      skip_next = true;
      continue;
    }

    if skip_next && line.starts_with("export PATH=") && line.contains(".local/bin") {
      skip_next = false;
      continue;
    }

    skip_next = false;
    lines.push(line);
  }

  if found {
    let mut file = fs::File::create(file_path)?;
    for line in lines {
      writeln!(file, "{}", line)?;
    }
    println!("Removed PATH entry from {}", file_path.display());
  }

  Ok(())
}

#[cfg(target_os = "windows")]
pub enum CheckAutoStartStatus {
  Registered,
  NotRegistered,
  NotExist,
  Error,
}
/// Check if the service is registered for autostart (Windows)
#[cfg(target_os = "windows")]
pub fn is_autostart_registered() -> Result<CheckAutoStartStatus, anyhow::Error> {
  use crate::utils::system_commands::query_windows_service_config;

  let query_config = query_windows_service_config("MarkdownEditorServer");

  let service_exists = query_config
    .as_ref()
    .map(|output| output.status.success())
    .unwrap_or(false);

  if service_exists {
    // Check if it's already set to auto start
    if let Ok(output) = &query_config {
      let stdout = String::from_utf8_lossy(&output.stdout);
      if stdout.contains("START_TYPE         : 2   AUTO_START") {
        return Ok(CheckAutoStartStatus::Registered);
      }
    } else {
      return Ok(CheckAutoStartStatus::Error);
    }

    return Ok(CheckAutoStartStatus::NotRegistered);
  }

  Ok(CheckAutoStartStatus::NotExist)
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

  // Check if the service is actually running
  let is_running = stdout.contains("STATE              : 4  RUNNING");
  if !is_running {
    return None;
  }

  // Parse the PID from the output
  // The output format is like:
  // SERVICE_NAME: MarkdownEditorServer
  //         TYPE               : 10  WIN32_OWN_PROCESS
  //         STATE              : 4  RUNNING
  //         WIN32_EXIT_CODE    : 0  (0x0)
  //         SERVICE_EXIT_CODE  : 0  (0x0)
  //         CHECKPOINT         : 0x0
  //         WAIT_HINT          : 0x0
  //         PID                : 1234
  //         FLAGS              :

  for line in stdout.lines() {
    if line.trim().starts_with("PID") {
      if let Some(pid_str) = line.split(':').nth(1) {
        if let Ok(pid) = pid_str.trim().parse::<u32>() {
          if pid > 0 {
            // PID 0 is invalid
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
    // Write PID to file
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

/// Remove read-only attributes from a file on Windows using attrib command
#[cfg(target_os = "windows")]
pub fn remove_readonly_attributes(path: &PathBuf) -> Result<(), anyhow::Error> {
  use crate::utils::system_commands::remove_readonly_attribute;
  use std::os::windows::fs::MetadataExt;

  // Check if file has read-only attribute
  let metadata = match fs::metadata(path) {
    Ok(m) => m,
    Err(_) => return Ok(()), // If we can't read metadata, continue anyway
  };

  let attributes = metadata.file_attributes();
  const FILE_ATTRIBUTE_READONLY: u32 = 0x1;

  if (attributes & FILE_ATTRIBUTE_READONLY) != 0 {
    // Try using attrib command to remove read-only flag
    // Use the path as-is; Command handles proper escaping
    let path_str = path.to_string_lossy().to_string();
    let success = remove_readonly_attribute(&path_str).unwrap_or(false);

    if success {
      println!("Removed read-only attribute from {}", path.display());
    } else {
      println!(
        "Warning: Could not remove read-only attribute from {} (attrib command failed)",
        path.display()
      );
    }
  }

  Ok(())
}

pub fn remove_file_with_retry(path: &PathBuf) -> Result<(), anyhow::Error> {
  use std::fs;

  // Try to remove the file with retry logic (useful if file is temporarily locked)
  let mut attempts = 3;
  let mut last_error = None;

  while attempts > 0 {
    match fs::remove_file(path) {
      Ok(_) => {
        println!("Removed binary: {}", path.display());
        last_error = None;
        break;
      }
      Err(e) => {
        last_error = Some(e);
        attempts -= 1;
        if attempts > 0 {
          // Wait a bit before retrying (file might be locked by antivirus or system)
          println!(
            "Warning: Failed to remove binary (attempts remaining: {}). Error: {}",
            attempts,
            last_error.as_ref().unwrap()
          );
          std::thread::sleep(std::time::Duration::from_millis(500));
        }
      }
    }
  }

  // If all attempts failed, print detailed error
  if let Some(e) = last_error {
    eprintln!("\n❌ Failed to remove binary after multiple attempts:");
    eprintln!("   Path: {}", path.display());
    eprintln!("   Error: {}", e);
    eprintln!("   Error kind: {:?}", e.kind());

    #[cfg(target_os = "windows")]
    {
      eprintln!("\n💡 Suggestions for Windows:");
      eprintln!("   1. Make sure the server is fully stopped (wait a few seconds)");
      eprintln!("   2. Check if Windows Defender or antivirus is scanning the file");
      eprintln!("   3. Try running as Administrator");
      eprintln!("   4. Manually delete the file: {}", path.display());
      eprintln!("   5. Check if any process is using the file (use Process Explorer)");
    }

    return Err(anyhow::anyhow!(format!(
      "Failed to remove binary: {}. See error details above.",
      path.display()
    )));
  }

  return Ok(());
}
