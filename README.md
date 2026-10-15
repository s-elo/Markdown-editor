# Markdown Editor

[![Build](https://github.com/s-elo/Markdown-editor/actions/workflows/build.yml/badge.svg)](https://github.com/s-elo/Markdown-editor/actions/workflows/build.yml)

A web-based WYSIWYG markdown editor for local files or Markdown documents in a GitHub repository.

Built with [Milkdown](https://milkdown.dev/getting-started) and [React CodeMirror](https://uiwjs.github.io/react-codemirror/) for rich-text and source editing.

## Quick Start

**🌐 [Try it online](https://s-elo.github.io/Markdown-editor)**

### GitHub mode (online)

1. Open the [online editor](https://s-elo.github.io/Markdown-editor) and select **GitHub** in **Menu → Settings → Workspace mode**.
2. Sign in, install the GitHub App for your repository, then select a repository and branch (or create a docs repository). Choose a docs folder and select **Use workspace**.
3. Edit your documents, stage changes, and select **Publish staged** to commit them to GitHub.

### Local mode (download)

1. Download from the [latest release artifact](https://github.com/s-elo/Markdown-editor/releases).

Download `markdown-editor-macos.zip` for macOS or `markdown-editor-windows.zip` for Windows.

2. Unzip the file and run the binary file.

3. In **Menu → Settings**, select **Local** under **Workspace mode** and choose the root folder of your documents.

> [!TIP]
> On macOS, right-click to open the app.
>
> On Windows, right-click to run the executable as **administrator**.

## Key Features

- **WYSIWYG Editing**: Rich markdown editing experience with Milkdown
- **Dual Editor Mode**: Switch between WYSIWYG and raw markdown (CodeMirror) with real-time sync
- **File Operations**: Create, rename, copy, move, and delete files and folders directly from the editor
- **GitHub Workspaces**: Edit repository documents in the browser, stage changes, and publish commits to a selected branch
- **Local Git Integration**: Commit, push, pull, and manage git changes if your local document root is a git repository
- **Local Search**: Fast file name and content search across your documents based on [ripgrep
  ](https://github.com/BurntSushi/ripgrep)
- **Image Management**: Upload and manage images in the selected workspace

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
