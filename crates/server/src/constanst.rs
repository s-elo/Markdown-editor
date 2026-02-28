#[cfg(debug_assertions)]
pub const CORS_ALLOWED_ORIGINS: &[&str] = &["http://localhost:4000"];
#[cfg(not(debug_assertions))]
pub const CORS_ALLOWED_ORIGINS: &[&str] = &["https://s-elo.github.io"];
