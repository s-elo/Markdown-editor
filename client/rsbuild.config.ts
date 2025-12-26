import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';

const defaultPort = 3024;
const PORT = process.env.PORT ?? defaultPort;

export default defineConfig({
  plugins: [pluginReact(), pluginSass()],
  html: {
    template: './public/index.html',
  },
  output: {
    distPath: {
      root: '../dist/client',
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
