# Axum Demo

## Dev

Firstly, install the [watchexec](https://github.com/watchexec/watchexec).

Then install [systemfd](https://github.com/mitsuhiko/systemfd).

```bash
$ watchexec -r -- cargo run

# with socket
$ systemfd --no-pid -s http::3025 -- watchexec -r -- cargo run
```

You can install [cargo make](http://crates.io/crates/cargo-make).

```bash
$ cargo make dev
```
