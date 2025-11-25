import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';

const defualtPort = 3024;
const PORT = process.env.PORT ?? defualtPort;

export default defineConfig({
  plugins: [pluginReact(), pluginSass()],
  html: {
    template: './public/index.html',
  },
  output: {
    distPath: {
      root: 'build',
    },
  },
  server: {
    proxy: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      '/api': {
        target: `http://localhost:${PORT}`,
      },
    },
    open: true,
  },
});
