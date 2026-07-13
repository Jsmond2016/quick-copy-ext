# 环境配置优化

## 背景

原环境配置为用户自定义添加/删除，主面板的"复制选项"始终固定显示第一个环境的名称；点击复制时，环境字段取自页面 URL 匹配，导致开发者在 `localhost` 下调试时无法正确获取当前环境。

## 变更内容

### 1. 支持多套环境配置

设置页使用横向 Tab 展示环境配置组，例如“环境-1”“环境-2”。每个组内固定包含 4 个环境域名：

| 环境   | 预设 ID      | 说明             |
|--------|-------------|------------------|
| LOCAL  | `env-local` | 本地开发环境      |
| FAT    | `env-fat`   | 功能验收测试环境  |
| UAT    | `env-uat`   | 用户验收测试环境  |
| PROD   | `env-prod`  | 生产环境          |

- 每个 Tab 代表一套完整的 LOCAL / FAT / UAT / PROD 配置
- 支持新增和删除配置组，至少保留一组
- 新增组自动按“环境-N”命名，并切换到新 Tab
- 新增按钮固定在 Tab 区域右侧；Tab 较多时可横向滚动，但不显示滚动条
- 删除环境组需要在面板内二次确认，切换 Tab 或新增组会取消待确认状态
- 每个环境域名可选填写，空值不影响功能
- 旧版本的单套 `environments` 配置会自动迁移为“环境-1”
- 新版导入、导出使用 `environmentGroups` 数组，组内保留原 `environments` 结构

### 2. 环境动态检测

主面板展示的环境标签、复制内容中的环境字段，统一按以下优先级决定：

1. **非本地页面精确匹配**
   - 页面不是 localhost 时，优先通过页面 URL origin 匹配已配置域名
2. **请求域名精确匹配**
   - 遍历已捕获的 API 请求，通过请求 URL origin 匹配具体配置组和环境
3. **请求响应头 `x-forwarded-for`**
   - 遍历所有已捕获的 API 请求
   - 检查每个请求的 `x-forwarded-for` 响应头值
   - 值含 `.fat.` → FAT
   - 值含 `.uat.` → UAT
   - 值含 `.pro.` → PROD
4. **请求 URL 标记检测**
   - 若没有请求、或所有请求的 `x-forwarded-for` 都不含标记
   - 则检查请求 URL 是否含上述标记
5. **页面 URL 降级匹配**
   - 请求未命中时，尝试通过当前页面 URL origin 匹配已配置环境
6. **默认 PROD**
   - 有请求且无标记命中 → PROD

### 3. 复制输出格式

- 环境有对应 URL 配置：`- 环境FAT：https://saas-gw.fat.supermonkey.cc/path`
- 环境无对应 URL 配置（如 PROD 未填 URL）：`- 环境：PROD`

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/lib/quick-copy/settings.ts` | 环境组归一化、默认组生成及旧版单组配置迁移 |
| `src/lib/quick-copy/types.ts` | 新增 `EnvironmentGroupConfig` 数据结构 |
| `src/lib/quick-copy/url.ts` | 展开环境组后精确匹配，环境标记兜底 |
| `src/lib/quick-copy/feedback.ts` | 环境输出兼容无 URL 场景 |
| `src/pages/popup/Popup.tsx` | 非本地页面优先精确匹配，localhost 优先走请求检测 |
| `src/pages/popup/components/PopupBody.tsx` | 透传 `selectedEnvironment`，移除环境管理 props |
| `src/pages/popup/components/RequestParamsPanel.tsx` | 使用动态环境名称替换 `environments[0].name` |
| `src/pages/popup/components/SettingsPanel.tsx` | 横向环境组 Tab，每组展示四个固定环境域名 |
| `src/pages/popup/hooks/usePopupSettingsState.ts` | 管理环境组新增、删除和域名编辑状态 |
| `src/pages/popup/utils/settings-form.ts` | 环境组导入导出、域名格式及跨组重复校验 |
| `src/pages/popup/index.css` | 环境组 Tab 与组内域名表单样式 |
