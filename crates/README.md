# Markdown Editor Server

A Rust-based server and CLI for the Markdown Editor.

## Workspace Structure

```
crates/
├── server/     # Library crate - Core Axum server logic
└── cli/        # Binary crate - CLI for server management (md-server)
```

## Prerequisites

Install the following tools:

- [Rust](https://www.rust-lang.org/tools/install)
- [cargo-make](https://crates.io/crates/cargo-make): `cargo install cargo-make`
- [watchexec](https://github.com/watchexec/watchexec) (for hot-reload): `cargo install watchexec-cli`
- [systemfd](https://github.com/mitsuhiko/systemfd) (optional, for socket passing): `cargo install systemfd`

## CLI Usage

### Build and Run

```bash
# Build the workspace
cargo make build

# Build for release
cargo make release

# Install the CLI globally
cargo make install
```

### Server Management

```bash
# Start server in foreground
cargo make start
# or
md-server start

# Start server as daemon (background)
cargo make start-daemon
# or
md-server start --daemon

# Check server status
cargo make status
# or
md-server status

# Stop the server daemon
cargo make stop
# or
md-server stop
```

### Logs

```bash
# View recent logs
cargo make logs
# or
md-server logs

# Follow logs in real-time
cargo make logs-follow
# or
md-server logs --follow

# Clear all logs
cargo make logs-clear
# or
md-server logs clear
```

### Development

```bash
# Run with hot-reload (requires watchexec)
cargo make dev
```

This will start the server and the CLI with hot-reload.

To try the cli, can run `pnpm dev-cli` directly.

If not runnable, try `chmod +x ./target/release/mds` and then run `pnpm dev-cli`.

Others:

```bash
# Run tests
cargo make test

# Format code
cargo make fmt

# Run linter
cargo make clippy
```

## CLI Options

```
md-server <COMMAND>

Commands:
  start   Start the server
  stop    Stop a running daemon
  status  Check if the server is running
  logs    View or manage server logs

Start Options:
  -d, --daemon       Run as a background daemon
  --host <HOST>      Host to bind to [default: 127.0.0.1]
  --port <PORT>      Port to listen on [default: 3024]

Logs Options:
  -t, --tail <N>     Show the last N lines [default: 50]
  -f, --follow       Follow the log output
  clear              Clear all log files
```
