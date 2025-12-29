use anyhow::Result;
use std::process::Command;

/// Query Windows service status
#[cfg(target_os = "windows")]
pub fn query_windows_service(service_name: &str) -> Result<bool> {
  let query_status = Command::new("sc.exe")
    .args(["query", service_name])
    .status()?;

  Ok(query_status.success())
}

/// Create a Windows service
#[cfg(target_os = "windows")]
pub fn create_windows_service(
  service_name: &str,
  exe_path: &str,
  display_name: &str,
  start_type: &str,
) -> Result<bool> {
  let create_status = Command::new("sc.exe")
    .args([
      "create",
      service_name,
      "binPath=",
      &format!("\"{}\"", exe_path),
      "start=",
      start_type,
      "DisplayName=",
      display_name,
    ])
    .status()?;

  Ok(create_status.success())
}

/// Start a Windows service
#[cfg(target_os = "windows")]
pub fn start_windows_service(service_name: &str) -> Result<std::process::ExitStatus> {
  let status = Command::new("sc.exe")
    .args(["start", service_name])
    .status()?;

  Ok(status)
}

/// Stop a Windows service
#[cfg(target_os = "windows")]
pub fn stop_windows_service(service_name: &str) -> Result<std::process::ExitStatus> {
  let status = Command::new("sc.exe")
    .args(["stop", service_name])
    .status()?;

  Ok(status)
}

/// Delete a Windows service
#[cfg(target_os = "windows")]
pub fn delete_windows_service(service_name: &str) -> Result<std::process::ExitStatus> {
  let status = Command::new("sc.exe")
    .args(["delete", service_name])
    .status()?;

  Ok(status)
}

/// Query Windows service configuration
#[cfg(target_os = "windows")]
pub fn query_windows_service_config(service_name: &str) -> Result<std::process::Output> {
  let output = Command::new("sc.exe").args(["qc", service_name]).output()?;

  Ok(output)
}

/// Query extended Windows service information (including PID)
#[cfg(target_os = "windows")]
pub fn query_windows_service_ex(service_name: &str) -> Result<std::process::Output> {
  let output = Command::new("sc.exe")
    .args(["queryex", service_name])
    .output()?;

  Ok(output)
}

/// Configure Windows service start type
#[cfg(target_os = "windows")]
pub fn config_windows_service_start_type(
  service_name: &str,
  start_type: &str,
) -> Result<std::process::ExitStatus> {
  let status = Command::new("sc.exe")
    .args(["config", service_name, "start=", start_type])
    .status()?;

  Ok(status)
}

/// Load a macOS LaunchAgent
#[cfg(target_os = "macos")]
#[allow(dead_code)] // Used in install.rs on macOS
pub fn load_launch_agent(plist_path: &str) -> Result<bool> {
  let status = Command::new("launchctl")
    .args(["load", plist_path])
    .status()?;

  Ok(status.success())
}

/// Unload a macOS LaunchAgent
#[cfg(target_os = "macos")]
pub fn unload_launch_agent(plist_path: &str) -> Result<bool> {
  let status = Command::new("launchctl")
    .args(["unload", plist_path])
    .status()?;

  Ok(status.success())
}

/// Kill a Windows process by PID
#[cfg(target_os = "windows")]
pub fn kill_windows_process(pid: u32) -> Result<std::process::Output> {
  let output = Command::new("taskkill")
    .args(["/PID", &pid.to_string(), "/F"])
    .output()?;

  Ok(output)
}

/// Remove read-only attribute from a Windows file
#[cfg(target_os = "windows")]
pub fn remove_readonly_attribute(path: &str) -> Result<bool> {
  let status = Command::new("attrib").args(["-R", path]).status()?;

  Ok(status.success())
}
