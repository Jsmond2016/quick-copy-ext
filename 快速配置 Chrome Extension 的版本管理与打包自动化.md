# 快速配置 Chrome Extension 的版本管理与打包自动化

## 文档目的

本文档用于沉淀当前项目从 commit `7835a69495bdddeb19c147b5fbe4adad7052d7c4` 之后，围绕 Chrome Extension 的版本管理、changelog、打包、GitHub Actions 自动发布所完成的配置整理。

目标是方便在其他 Chrome Extension 项目中快速复用同一套方案。

适用场景：

- 单人维护项目
- 直接在 `main` 分支开发
- 普通提交只跑日常 CI
- 只有 `chore(release): x.y.z` 才触发正式打包与发布

## 最终目标

项目需要具备以下能力：

1. 普通提交推送到 `main` 时，只执行日常 CI
2. 发布版本时，自动更新版本号和 changelog
3. 发布提交推送后，GitHub Actions 自动：
   - 构建 Chrome / Firefox 产物
   - 生成 zip 包
   - 创建 git tag
   - 创建 GitHub Release

## 本次涉及的核心文件

### 1. `package.json`

补充以下脚本：

```json
{
  "scripts": {
    "build": "vite build --config vite.config.chrome.ts",
    "build:chrome": "vite build --config vite.config.chrome.ts",
    "build:firefox": "vite build --config vite.config.firefox.ts",
    "lint": "eslint src --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "release": "bash scripts/release.sh",
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s -r 0",
    "changelog:all": "conventional-changelog -p angular -i CHANGELOG.md -s",
    "version:patch": "bash scripts/bump-version.sh patch",
    "version:minor": "bash scripts/bump-version.sh minor",
    "version:major": "bash scripts/bump-version.sh major",
    "commit:check": "commitlint --from HEAD~1 --to HEAD --verbose"
  }
}
```

同时补充依赖：

- `@commitlint/cli`
- `@commitlint/config-conventional`
- `conventional-changelog-cli`

以及：

```json
{
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild"]
  }
}
```

## 2. `CHANGELOG.md`

初始化一个标准 changelog 文件：

```md
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
```

建议在项目切换为个人仓库后，手动补一条首个基线版本，例如：

```md
## [1.4.0] - 2026-04-12
```

这样后面的 changelog 会以你自己的项目版本为起点，而不是从模板历史开始。

## 3. `commitlint.config.js`

用于约束 commit message，尤其是 release commit。

当前使用：

```js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'build', 'revert'],
    ],
  },
};
```

## 4. `scripts/bump-version.sh`

作用：

- 自动执行 `npm version patch|minor|major --no-git-tag-version`
- 使用 `conventional-changelog` 生成当前版本 changelog
- 自动提交一条 release commit

最终关键点：

- 只生成最新版本的 changelog
- 保留 `CHANGELOG.md` 头部
- 将新增版本内容插入在 `## [Unreleased]` 下方
- 自动提交：

```bash
git commit --no-verify -m "chore(release): $VERSION_NUMBER"
```

## 5. `scripts/generate-changelog.sh`

作用：

- 本地按 commit 历史分类输出 changelog
- 支持根据版本范围读取提交
- 支持手动更新 `CHANGELOG.md`

适合用于调试 changelog 生成逻辑。

## 6. `scripts/release.sh`

作用：

- 手动指定版本号
- 本地先构建
- 创建 release commit
- 创建 tag

这类脚本适合作为备用手段，但当前项目的主流程更推荐使用：

```bash
pnpm run version:patch
git push origin main
```

## 7. `.github/workflows/ci.yml`

作用：

- 普通 CI
- 日常 push / PR 触发
- 负责类型检查和构建验证

当前关键逻辑：

```yaml
jobs:
  build:
    if: github.event_name != 'push' || !startsWith(github.event.head_commit.message, 'chore(release): ')
```

这条配置非常关键，它保证：

- 普通提交继续跑 CI
- `chore(release): x.y.z` 不再重复执行普通构建流程

否则同一个 release commit 会同时触发：

- `ci.yml`
- `auto-release.yml`

造成重复构建。

## 8. `.github/workflows/auto-release.yml`

作用：

- 监听 `main` 分支 push
- 检查最新 commit 是否符合 release 格式
- 通过后自动构建、打 tag、打包 zip、创建 release

当前设计要点：

### 触发条件

```yaml
on:
  push:
    branches: [main]
```

### release commit 识别

```bash
if [[ $COMMIT_MSG =~ ^chore\(release\):\ ([0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?)$ ]]; then
```

### 自动生成 tag

```bash
echo "tag_name=v$VERSION" >> $GITHUB_OUTPUT
```

### 打包产物命名

```text
quick-copy-ext_x.y.z.zip
quick-copy-ext_firefox_x.y.z.zip
```

### Release body 来源

从 `CHANGELOG.md` 中读取当前版本对应的区块，而不是写死文本模板。

## 推荐使用流程

### 日常开发

普通提交：

```bash
git add .
git commit -m "feat: xxx"
git push origin main
```

效果：

- 只跑 `ci.yml`
- 不会打包 release zip

### 正式发版

补丁版本：

```bash
pnpm run version:patch
git push origin main
```

次版本：

```bash
pnpm run version:minor
git push origin main
```

主版本：

```bash
pnpm run version:major
git push origin main
```

效果：

1. 更新 `package.json` 版本号
2. 更新 `CHANGELOG.md`
3. 生成 `chore(release): x.y.z`
4. 推送后触发 `auto-release.yml`
5. 自动生成：
   - git tag
   - zip 包
   - GitHub Release

## 本次实际踩过的坑与修复

### 问题 1：项目基于模板开发，旧 tag 被继承

现象：

- 本地存在模板仓库的旧 tag，例如 `v1.0.0`、`v1.4.0` 等
- 这些 tag 容易污染当前项目的 changelog 与 release 基线

处理方式：

1. 先确认个人远端仓库是否已有 tag
2. 如果远端没有，则删除本地继承 tag
3. 重新在当前项目状态上打一个属于自己的基线 tag，例如 `v1.4.0`

结论：

- 不要直接沿用模板历史 tag
- 建议在迁移为个人项目后手动重建首个正式版本基线

### 问题 2：自动发布没有触发 zip 打包

现象：

- 手动打了 tag，但 Actions 没有开始发布

原因：

- 自动发布工作流监听的是 `push main`
- 不是监听 `tag push`
- 只有最新 commit message 满足 `chore(release): x.y.z` 才会进入发布流程

结论：

- 当前方案里，正确触发 release 的动作是“推送 release commit 到 main”
- 不是“手动单独 push tag”

### 问题 3：`pnpm/action-setup` 版本冲突

报错：

```text
Multiple versions of pnpm specified
```

原因：

- workflow 里显式写了：

```yaml
with:
  version: 10.23.0
```

- `package.json` 又写了：

```json
"packageManager": "pnpm@10.23.0+..."
```

两个地方同时指定版本，导致冲突。

修复方式：

- 删除 workflow 里的 `version`
- 让 Action 直接读取 `package.json` 的 `packageManager`

结论：

- `pnpm` 版本只保留一个来源
- 推荐以 `package.json.packageManager` 为准

### 问题 4：release commit 导致 CI 重复执行

现象：

- 同一个 `chore(release): x.y.z` 提交会触发两套 workflow
- GitHub Actions 页面看起来像重复跑任务

原因：

- `ci.yml` 在监听 `push main`
- `auto-release.yml` 也在监听 `push main`
- release commit 同时命中两者

修复方式：

在 `ci.yml` 中加条件：

```yaml
if: github.event_name != 'push' || !startsWith(github.event.head_commit.message, 'chore(release): ')
```

结论：

- 普通提交跑 CI
- release 提交只跑自动发布

### 问题 5：changelog 脚本重复拼接内容

现象：

- `CHANGELOG.md` 被重复插入多次 `Unreleased` 和历史内容

原因：

- 初版脚本直接对 `CHANGELOG.md` 原文件做覆盖式处理
- 头部和历史内容拼接逻辑不严谨

修复方式：

- 先拆出三段：
  - 头部
  - 历史正文
  - 当前新版本条目
- 再重新组装：

```bash
head -n 7 CHANGELOG.md > "$HEADER_FILE"
tail -n +8 CHANGELOG.md > "$BODY_FILE"
conventional-changelog -p angular -r 1 > "$NEW_ENTRY_FILE"
```

结论：

- changelog 生成脚本必须避免直接在原文件上反复覆盖拼接
- 推荐先拆段，再重组

## GitHub 仓库需要确认的设置

在 GitHub 仓库中，需检查：

### 1. Actions 权限

`Settings` -> `Actions` -> `General`

- 允许 Actions 运行

### 2. Workflow permissions

`Settings` -> `Actions` -> `General` -> `Workflow permissions`

需要选择：

- `Read and write permissions`

否则 workflow 无法：

- 创建 tag
- 创建 release
- 上传 zip 资源

## 建议复制到其他项目时的最小清单

如果你要在另一个 Chrome Extension 项目快速落地同样方案，最少需要同步以下内容：

1. `package.json` 中的 scripts 和 devDependencies
2. `CHANGELOG.md`
3. `commitlint.config.js`
4. `scripts/bump-version.sh`
5. `scripts/generate-changelog.sh`
6. `scripts/release.sh`
7. `.github/workflows/ci.yml`
8. `.github/workflows/auto-release.yml`

同时记得替换这些项目相关信息：

- GitHub 仓库地址
- Release zip 文件名
- Release body 中的项目标题
- 当前扩展的构建输出目录名
- `CHANGELOG.md` 中的 compare 链接

## 当前项目对应的关键提交

从 commit `7835a69495bdddeb19c147b5fbe4adad7052d7c4` 之后，与本主题直接相关的提交包括：

- `ce3a6b8` `build: add changelog and release tooling`
- `c9a0fe8` `docs: initialize release baseline changelog`
- `f98ca2f` `fix: normalize changelog release script`
- `cb6a89a` `ci: fix pnpm version setup conflict`
- `1deb3c9` `ci: skip build workflow for release commits`

这些提交基本构成了当前项目可复用的自动化配置演进过程。
