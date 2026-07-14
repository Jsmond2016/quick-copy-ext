# 版本发布流程

> **更新时间**：2026-07-14；**使用模型**：Codex（GPT-5）；**用户**：Jsmond2016

---

## 日常开发

使用 [Angular Commit Convention](https://www.conventionalcommits.org/) 提交代码：

```bash
git add .
git commit -m "feat: 新增 xxx 功能"
git commit -m "fix: 修复 xxx 问题"
git commit -m "refactor: 重构 xxx 模块"
git commit -m "docs: 更新 xxx 文档"
git push origin main
```

提交类型：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`chore`、`ci`、`build`、`revert`

## 发布新版本

```bash
# 补丁版本（1.4.43 → 1.4.44）
pnpm run version:patch

# 次版本（1.4.x → 1.5.0）
pnpm run version:minor

# 主版本（1.x.x → 2.0.0）
pnpm run version:major
```

上述命令会自动执行以下操作：

1. 检查最近版本 tag 之后是否存在新的非合并提交；没有则终止，避免重复发版
2. 更新 `package.json` 版本号和发布日期
3. 从 Conventional Commits 增量生成 `CHANGELOG.md` 条目
4. 自动提交 release commit：`chore(release): x.y.z`
5. 在本地创建 annotated tag：`vx.y.z`

命令不会自动推送 release commit。确认结果后只推送 `main`：

```bash
git push origin main
```

::: warning 不要提前推送本地 tag
自动发布工作流检测到远端 tag 已存在时会跳过构建和 Release 创建。本地 tag 用于标记版本和阻止重复发版，远端 tag 由工作流创建并推送。
:::

## 自动发布

推送 `main` 分支后，GitHub Actions 自动执行：

1. 检测到 commit message 为 `chore(release): x.y.z` 时触发
2. 安装依赖
3. 构建 Chrome / Firefox 扩展
4. 生成 ZIP 包
5. 创建并推送 Git tag
6. 创建 GitHub Release

## 常用命令一览

| 命令 | 说明 |
|------|------|
| `pnpm run changelog` | 重新生成 CHANGELOG.md |
| `pnpm run version:patch` | 发布补丁版本 |
| `pnpm run version:minor` | 发布次版本 |
| `pnpm run version:major` | 发布主版本 |
| `pnpm run commit:check` | 检查最近一次提交信息是否规范 |

## 发布脚本

| 文件 | 说明 |
|------|------|
| `scripts/bump-version.sh` | 检查新提交，更新版本号和 changelog，创建提交与本地 tag |
| `scripts/generate-changelog.sh` | 按提交历史生成 changelog 条目 |
| `scripts/release.sh` | 指定版本发布：更新 changelog、构建双端产物、创建提交与本地 tag |
| `.github/workflows/ci.yml` | 日常 CI（非 release 提交触发） |
| `.github/workflows/auto-release.yml` | 自动发布（release 提交触发） |
