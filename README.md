# Markdown Editor

[![Build](https://github.com/s-elo/Markdown-editor/actions/workflows/build.yml/badge.svg)](https://github.com/s-elo/Markdown-editor/actions/workflows/build.yml)

A web-based WYSIWYG markdown editor that works with your local files. Simply specify the root path of your documents to start editing.

**🌐 [Try it online](https://s-elo.github.io/Markdown-editor)**

Built with [Milkdown](https://milkdown.dev/getting-started) and [React CodeMirror](https://uiwjs.github.io/react-codemirror/) for editing and displaying local markdown files.

## Key Features

- **WYSIWYG Editing**: Rich markdown editing experience with Milkdown
- **Dual Editor Mode**: Switch between WYSIWYG and raw markdown (CodeMirror) with real-time sync
- **File Operations**: Create, rename, copy, move, and delete files and folders directly from the editor
- **Git Integration**: Commit, push, pull, and manage git changes if your document root is a git repository
- **Search**: Fast file name and content search across your documents based on [ripgrep
  ](https://github.com/BurntSushi/ripgrep)
- **Image Management**: Upload and manage images stored locally.

## Development

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/)

### Setup

```bash
# Install dependencies
pnpm install
```

### Run Development Server

The project consists of two main components:

- **Rust Server** (`crates/server`): Handles file operations, git sync, and search
- **React Client** (`client`): Web UI built with React and TypeScript

Start both components:

```bash
pnpm dev
```

This will automatically start the Rust server and React client with hot-reload.

### Build

```bash
# Build both server and client
pnpm build
```

### Release

Formal release:

```bash
pnpm release patch
pnpm release minor
pnpm release major
```

Pre-release:

```bash
pnpm release patch --alpha
pnpm release minor --beta
pnpm release major --rc
```
