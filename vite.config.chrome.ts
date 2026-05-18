import { resolve } from 'path';
import { mergeConfig, defineConfig } from 'vite';
import { crx, ManifestV3Export } from '@crxjs/vite-plugin';
import baseConfig, { baseManifest, baseBuildOptions } from './vite.config.base'

const outDir = resolve(__dirname, 'dist_chrome');
const typedBaseManifest = baseManifest as ManifestV3Export & {
  action?: Record<string, unknown>;
  permissions?: string[];
};
const { action: baseAction, permissions: basePermissions = [], ...chromeManifestBase } = typedBaseManifest;
const chromePermissions = Array.from(new Set([...basePermissions]));

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      crx({
        manifest: {
          ...chromeManifestBase,
          permissions: chromePermissions,
          action: {
            ...baseAction,
            default_title:
              typeof baseAction?.default_title === 'string'
                ? baseAction.default_title
                : 'Quick Copy',
          },
          background: {
            service_worker: 'src/pages/background/index.ts',
            type: 'module'
          },
        } as ManifestV3Export,
        browser: 'chrome',
        contentScripts: {
          injectCss: true,
        }
      })
    ],
    build: {
      ...baseBuildOptions,
      outDir
    },
  })
)
