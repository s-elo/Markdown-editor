use std::fs;
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};

use anyhow::{Context, Result};
use server::default_log_dir;

/// View server logs
pub fn cmd_logs_view(tail: usize, follow: bool) -> Result<()> {
  let log_dir = default_log_dir();

  // Find the most recent log file
  let log_files: Vec<_> = fs::read_dir(&log_dir)
    .context("Failed to read logs directory")?
    .filter_map(|e| e.ok())
    .filter(|e| {
      e.path()
        .file_name()
        .and_then(|n| n.to_str())
        .map(|n| n.starts_with("server.log"))
        .unwrap_or(false)
    })
    .collect();

  if log_files.is_empty() {
    println!("No log files found in {:?}", log_dir);
    return Ok(());
  }

  // Get the most recent log file
  let mut log_files: Vec<_> = log_files.into_iter().map(|e| e.path()).collect();
  log_files.sort();
  let log_file = log_files.last().unwrap();

  println!("Reading from: {:?}\n", log_file);

  let file = fs::File::open(log_file)?;
  let reader = BufReader::new(file);

  // Read all lines and show the last N
  let lines: Vec<String> = reader.lines().filter_map(|l| l.ok()).collect();
  let start = lines.len().saturating_sub(tail);

  for line in &lines[start..] {
    println!("{}", line);
  }

  if follow {
    println!("\n--- Following log output (Ctrl+C to stop) ---\n");

    let mut file = fs::File::open(log_file)?;
    file.seek(SeekFrom::End(0))?;

    let mut buffer = String::new();
    loop {
      buffer.clear();
      match file.read_to_string(&mut buffer) {
        Ok(0) => {
          std::thread::sleep(std::time::Duration::from_millis(100));
        }
        Ok(_) => {
          print!("{}", buffer);
        }
        Err(e) => {
          eprintln!("Error reading log: {}", e);
          break;
        }
      }
    }
  }

  Ok(())
}

/// Clear all log files
pub fn cmd_logs_clear() -> Result<()> {
  let log_dir = default_log_dir();

  if !log_dir.exists() {
    println!("No logs directory found");
    return Ok(());
  }

  let mut count = 0;
  for entry in fs::read_dir(&log_dir)? {
    let entry = entry?;
    if entry.path().is_file() {
      fs::remove_file(entry.path())?;
      count += 1;
    }
  }

  println!("Cleared {} log file(s)", count);

  Ok(())
}
