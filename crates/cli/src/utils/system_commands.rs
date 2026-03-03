/// Query Windows service status
#[cfg(target_os = "windows")]
pub fn query_windows_service(service_name: &str) -> anyhow::Result<bool> {
  let query_status = std::process::Command::new("sc.exe")
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
) -> anyhow::Result<bool> {
  let create_status = std::process::Command::new("sc.exe")
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

#[cfg(target_os = "windows")]
pub fn update_bin_path_windows_service(service_name: &str, exe_path: &str) -> anyhow::Result<bool> {
  let update_status = std::process::Command::new("sc.exe")
    .args([
      "config",
      service_name,
      "binPath=",
      &format!("\"{}\"", exe_path),
    ])
    .status()?;

  Ok(update_status.success())
}

/// Start a Windows service
#[cfg(target_os = "windows")]
pub fn start_windows_service(service_name: &str) -> anyhow::Result<std::process::ExitStatus> {
  let status = std::process::Command::new("sc.exe")
    .args(["start", service_name])
    .status()?;

  Ok(status)
}

/// Stop a Windows service
#[cfg(target_os = "windows")]
pub fn stop_windows_service(service_name: &str) -> anyhow::Result<std::process::ExitStatus> {
  let status = std::process::Command::new("sc.exe")
    .args(["stop", service_name])
    .status()?;

  Ok(status)
}

/// Delete a Windows service
#[cfg(target_os = "windows")]
// pub fn delete_windows_service(service_name: &str) -> anyhow::Result<std::process::ExitStatus> {
//   let status = std::process::Command::new("sc.exe")
//     .args(["delete", service_name])
//     .status()?;

//   Ok(status)
// }

/// Query extended Windows service information (including PID)
#[cfg(target_os = "windows")]
pub fn query_windows_service_ex(service_name: &str) -> anyhow::Result<std::process::Output> {
  let output = std::process::Command::new("sc.exe")
    .args(["queryex", service_name])
    .output()?;

  Ok(output)
}

/// Kill a Windows process by PID
#[cfg(target_os = "windows")]
pub fn kill_windows_process(pid: u32) -> anyhow::Result<std::process::Output> {
  let output = std::process::Command::new("taskkill")
    .args(["/PID", &pid.to_string(), "/F"])
    .output()?;

  Ok(output)
}
