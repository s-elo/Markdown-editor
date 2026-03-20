fn main() {
  let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
  if target_os != "windows" {
    return;
  }

  let icon_path = std::path::Path::new("assets/icon.ico");
  let mut res = winresource::WindowsResource::new();
  res.set("ProductName", "Markdown Editor");
  res.set("FileDescription", "Markdown Editor");

  if icon_path.exists() {
    res.set_icon(icon_path.to_str().unwrap());
  }

  if let Err(e) = res.compile() {
    eprintln!("cargo:warning=Failed to compile Windows resources: {e}");
  }
}
