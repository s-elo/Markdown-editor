import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';

const defaultPort = 3024;
const PORT = process.env.PORT ?? defaultPort;

// Base path for GitHub Pages (set via GITHUB_PAGES_BASE_PATH env var)
// For project pages: /repo-name/
// For user/organization pages: /
const basePath = process.env.GITHUB_PAGES_BASE_PATH ?? '';

export default defineConfig({
  plugins: [pluginReact(), pluginSass()],
  html: {
    template: './public/index.html',
  },
  output: {
    distPath: {
      root: '../dist',
    },
  },
  source: {
    define: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      __GITHUB_PAGES_BASE_PATH__: JSON.stringify(basePath),
    },
  },
  server: {
    proxy: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      '/api': {
        target: `http://127.0.0.1:${PORT}`,
      },
    },
    open: true,
  },
});
