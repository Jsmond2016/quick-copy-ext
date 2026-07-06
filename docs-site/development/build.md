# 构建与打包

## 生产构建

```bash
# Chrome 版本
pnpm build
# 或
pnpm build:chrome

# Firefox 版本
pnpm build:firefox
```

## 构建产物

- Chrome：`dist_chrome/` 目录
- Firefox：`dist_firefox/` 目录（如已构建）

## Vite 配置

项目使用多配置文件架构：

| 文件 | 用途 |
|------|------|
| `vite.config.base.ts` | 共享配置：React 插件、TypeScript 路径、自定义插件 |
| `vite.config.chrome.ts` | Chrome 构建：`@crxjs/vite-plugin`、`dist_chrome/` |
| `vite.config.firefox.ts` | Firefox 构建：背景脚本以数组形式、`dist_firefox/` |
| `custom-vite-plugins.ts` | 自定义插件：`stripDevIcons`、`crxI18n` |

## TypeScript 检查

```bash
pnpm exec tsc --noEmit
```

## ESLint

```bash
pnpm lint
pnpm lint:fix
```
