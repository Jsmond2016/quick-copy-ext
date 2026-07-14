# 近期代码变更

> **编写时间**：2026-07-14；**使用模型**：Codex（GPT-5）；**用户**：Jsmond2016

---

本文汇总 VitePress 文档站创建后（`1e8f889`，2026-07-06）到当前版本 `v1.4.47` 的有效代码变更。发布提交和合并提交不重复展开。

## 变更摘要

| 日期 | 变更 | 用户影响 | 主要代码位置 |
|------|------|----------|--------------|
| 2026-07-08 | 固定环境槽位与环境自动识别 | 每套环境固定为 LOCAL、FAT、UAT、PROD；本地页面可根据请求识别实际后端环境 | `src/lib/quick-copy/settings.ts`、`url.ts` |
| 2026-07-09 | 接口名称展示 | Apifox 匹配成功后，请求列表在路径下方展示接口中文名称 | `RequestHistoryPanel.tsx` |
| 2026-07-09 | 环境能力收敛到开发者模式 | 环境配置、环境跳转和复制环境开关仅在开发者模式展示 | `SettingsPanel.tsx`、`PopupHero.tsx`、`RequestParamsPanel.tsx` |
| 2026-07-10 | 发布脚本修正 | 避免无新提交时重复发版，生成增量 changelog，并在本地创建版本 tag | `scripts/bump-version.sh`、`scripts/release.sh` |
| 2026-07-13 | 多套环境配置 | 可用 Tab 管理多组项目环境；旧版单组 `environments` 自动迁移 | `settings.ts`、`settings-form.ts`、`SettingsPanel.tsx` |
| 2026-07-13 | Apifox 保存刷新优化 | 只有项目 ID 或授权令牌变化时才清理或刷新缓存 | `Popup.tsx`、`apifox-settings.ts` |
| 2026-07-14 | 单接口快捷复制 | 每条请求新增复制按钮，可直接复制方法、路径和可选接口名 | `RequestHistoryPanel.tsx`、`usePopupFeedbackActions.ts` |

## 环境配置模型

环境配置从单个 `environments` 数组升级为 `environmentGroups`：

```typescript
interface EnvironmentGroupConfig {
  id: string;
  name: string;
  environments: EnvironmentConfig[];
}

interface EnvironmentConfig {
  id: string;
  name: string;
  url: string;
}
```

每组始终保留四个固定槽位，运行时规范化逻辑会把 `name` 收敛为 LOCAL、FAT、UAT、PROD，用户只填写域名。配置加载和 JSON 导入仍兼容旧版 `environments` 数组，并将其迁移为第一组环境。

环境识别遵循以下优先级：

1. 非本地页面优先按页面 URL 的 `origin` 精确匹配。
2. 本地页面先按请求 URL 的 `origin` 精确匹配。
3. 检查请求响应头 `x-forwarded-for` 中的 `.fat.`、`.uat.`、`.pro.` 标记。
4. 降级检查请求 URL 中的同类标记。
5. 已有请求但未命中标记时按 PROD 处理。

跳转到其他环境时会保留当前页面的路径、查询参数和 hash。不同环境组之间不允许配置重复域名。

## 请求列表交互

Apifox 关联成功后，请求卡片会同时展示接口路径和 `apiName`。卡片右侧的复制按钮不会改变当前多选状态，复制格式为：

```text
GET /api/saas/user/list [查询用户列表]
```

没有接口名时只复制请求方法与路径。底部主复制按钮的行为保持不变，仍生成包含页面信息、所选请求、备注和自定义字段的完整反馈文本。

## 保存与发布行为

- 保存普通设置时复用当前 Apifox 缓存；只有 `apifoxExportUrl` 或 `apifoxAuthToken` 变化才触发缓存清理或后台刷新。
- `version:patch`、`version:minor`、`version:major` 会检查最近 tag 之后是否存在新提交，生成增量 changelog，创建 release commit 和本地 annotated tag。
- `scripts/release.sh` 同样会更新 changelog、构建 Chrome/Firefox 产物并创建本地 tag。
- 发版时只推送 release commit；自动发布工作流负责创建并推送远端 tag，提前推送 tag 会导致工作流跳过发布。

::: tip 文档入口
环境配置的操作细节见[多环境切换](/features/environments)，完整数据结构见[配置项参考](/configuration/settings-reference)，复制交互见[请求多选与复制](/features/multi-select)。
:::
