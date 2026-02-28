import fs from 'fs';
import path from 'path';

import type { RsbuildPlugin } from '@rsbuild/core';

/** Theme names to copy from primereact/resources/themes (only these are used at runtime) */
const PRIME_THEMES = ['lara-dark-blue', 'lara-light-blue'] as const;

const PRIME_THEMES_SOURCE = 'node_modules/primereact/resources/themes';

/* eslint-disable @typescript-eslint/naming-convention -- file extensions for MIME */
const MIME: Record<string, string> = {
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Rsbuild plugin: PrimeReact themes as build-time assets only.
 * - Build: copies theme files from node_modules to dist/themes/ (no themes in public or git).
 * - Dev: serves /themes/* from node_modules via middleware.
 */
export function pluginPrimeThemes(options?: { themes?: string[] }): RsbuildPlugin {
  const themes = options?.themes ?? [...PRIME_THEMES];

  return {
    name: 'plugin-prime-themes',
    setup(api) {
      api.modifyRsbuildConfig((config) => {
        const root = config.root ?? process.cwd();

        // Build: copy PrimeReact themes from node_modules to dist/themes/
        const existingCopy = config.output?.copy;
        const copyPatterns = themes.map((name) => ({
          from: path.join(root, PRIME_THEMES_SOURCE, name),
          to: `themes/${name}`,
        }));
        const mergedCopy = existingCopy
          ? Array.isArray(existingCopy)
            ? [...existingCopy, ...copyPatterns]
            : [existingCopy, ...copyPatterns]
          : copyPatterns;
        const output = config.output ?? {};
        config.output = { ...output, copy: mergedCopy as typeof output.copy };

        // Dev: serve /themes/* from node_modules (no public/themes needed)
        const themesDir = path.resolve(root, PRIME_THEMES_SOURCE);
        const existingMiddlewares = config.dev?.setupMiddlewares;
        const setup = (middlewares: { push: (...handlers: unknown[]) => void }, context: unknown) => {
          if (existingMiddlewares) {
            const fns = Array.isArray(existingMiddlewares) ? existingMiddlewares : [existingMiddlewares];
            fns.forEach((fn) => {
              (fn as (m: typeof middlewares, c: typeof context) => void)(middlewares, context);
            });
          }
          middlewares.push(
            (
              req: { url?: string },
              res: { setHeader: (a: string, b: string) => void; end: (data?: Buffer) => void },
              next: () => void,
            ) => {
              const url = req.url?.split('?')[0] ?? '';
              if (!url.startsWith('/themes/')) {
                next();
                return;
              }
              const subpath = url.slice('/themes/'.length);
              if (!subpath || subpath.includes('..')) {
                next();
                return;
              }
              const file = path.join(themesDir, subpath);
              const resolved = path.normalize(path.resolve(file));
              const allowed = path.normalize(path.resolve(themesDir));
              if (!resolved.startsWith(allowed) || !fs.existsSync(resolved)) {
                next();
                return;
              }
              const stat = fs.statSync(resolved);
              if (!stat.isFile()) {
                next();
                return;
              }
              const ext = path.extname(resolved);
              const mime = MIME[ext] ?? 'application/octet-stream';
              res.setHeader('Content-Type', mime);
              res.end(fs.readFileSync(resolved));
            },
          );
        };
        const dev = config.dev ?? {};
        config.dev = {
          ...dev,
          setupMiddlewares: (existingMiddlewares
            ? [...(Array.isArray(existingMiddlewares) ? existingMiddlewares : [existingMiddlewares]), setup]
            : [setup]) as typeof dev.setupMiddlewares,
        };
      });
    },
  };
}
