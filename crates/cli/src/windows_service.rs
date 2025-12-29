#[cfg(target_os = "windows")]
use std::ffi::OsString;
#[cfg(target_os = "windows")]
use windows_service::define_windows_service;

use crate::constants::{DEFAULT_HOST, DEFAULT_PORT, default_editor_settings_file, default_log_dir};

#[cfg(target_os = "windows")]
define_windows_service!(ffi_service_main, my_service_main);

#[cfg(target_os = "windows")]
fn my_service_main(_arguments: Vec<OsString>) {
  use std::sync::mpsc;
  use std::time::Duration;
  use windows_service::service::{
    ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus, ServiceType,
  };
  use windows_service::service_control_handler::{self, ServiceControlHandlerResult};

  let (shutdown_tx, shutdown_rx) = mpsc::channel();

  let event_handler = move |control_event| -> ServiceControlHandlerResult {
    match control_event {
      ServiceControl::Stop => {
        let _ = shutdown_tx.send(());
        ServiceControlHandlerResult::NoError
      }
      _ => ServiceControlHandlerResult::NotImplemented,
    }
  };

  let status_handle =
    service_control_handler::register("MarkdownEditorServer", event_handler).unwrap();

  status_handle
    .set_service_status(ServiceStatus {
      service_type: ServiceType::OWN_PROCESS,
      current_state: ServiceState::Running,
      controls_accepted: ServiceControlAccept::STOP,
      exit_code: ServiceExitCode::Win32(0),
      checkpoint: 0,
      wait_hint: Duration::default(),
      process_id: None,
    })
    .unwrap();

  // Run the server
  let config = server::ServerConfig {
    host: DEFAULT_HOST.to_string(),
    port: DEFAULT_PORT,
    log_dir: default_log_dir(),
    log_to_terminal: false,
    editor_settings_file: default_editor_settings_file(),
  };

  let rt = tokio::runtime::Runtime::new().unwrap();
  let _server_future = rt.spawn(async move {
    server::run_server(config).await.unwrap();
  });

  // Wait for shutdown signal
  let _ = shutdown_rx.recv();

  // Stop the server
  rt.shutdown_timeout(Duration::from_secs(5));

  status_handle
    .set_service_status(ServiceStatus {
      service_type: ServiceType::OWN_PROCESS,
      current_state: ServiceState::Stopped,
      controls_accepted: ServiceControlAccept::empty(),
      exit_code: ServiceExitCode::Win32(0),
      checkpoint: 0,
      wait_hint: Duration::default(),
      process_id: None,
    })
    .unwrap();
}
