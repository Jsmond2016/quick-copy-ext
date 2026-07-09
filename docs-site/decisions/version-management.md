# 版本管理与打包自动化

## 概述

本文档介绍 Quick Copy Ext 的版本管理、Changelog 生成、打包和 GitHub Actions 自动发布的配置方案。方便在同类项目中复用。

## 核心工作流

### 日常开发

```bash
git add .
git commit -m "feat: xxx"
git push origin main
```

效果：只触发 `ci.yml` 进行类型检查和构建验证。

### 正式发版

```bash
pnpm run version:patch   # 补丁版本
pnpm run version:minor   # 次版本
pnpm run version:major   # 主版本
git push origin main
```

效果：

1. 更新 `package.json` 版本号 + `CHANGELOG.md`
2. 生成 `chore(release): x.y.z` 提交
3. 推送后触发 `auto-release.yml`
4. 自动构建、打 tag、打包 zip、创建 Release

## 核心配置

| 文件 | 说明 |
|------|------|
| `package.json` | Scripts + `conventional-changelog-cli` 依赖 |
| `commitlint.config.js` | Conventional Commits 规范 |
| `scripts/bump-version.sh` | 更新版本号 + changelog + 提交 |
| `scripts/generate-changelog.sh` | 手动生成 changelog 条目 |
| `scripts/release.sh` | 手动发布脚本（备用） |
| `.github/workflows/ci.yml` | 日常 CI（过滤 release 提交） |
| `.github/workflows/auto-release.yml` | 自动发布工作流 |

## 注意事项

- Release 提交 `chore(release): x.y.z` 会触发自动发布，而非手动 push tag
- CI 工作流需增加条件避免 release 提交重复执行
- pnpm 版本只保留一个来源（`package.json.packageManager`）
- Changelog 生成脚本避免直接在原文件上反复覆盖拼接
