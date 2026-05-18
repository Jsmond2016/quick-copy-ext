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
const { default_popup: _defaultPopup, ...chromeActionBase } = (baseAction ?? {}) as Record<string, unknown>;
const chromePermissions = Array.from(new Set([...basePermissions, 'sidePanel']));

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      crx({
        manifest: {
          ...chromeManifestBase,
          permissions: chromePermissions,
          action: {
            ...chromeActionBase,
            default_title:
              typeof chromeActionBase.default_title === 'string'
                ? chromeActionBase.default_title
                : '打开 Quick Copy 侧边栏',
          },
          side_panel: {
            default_path: 'src/pages/sidepanel/index.html',
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
