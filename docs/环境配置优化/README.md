# 环境配置优化

## 背景

原环境配置为用户自定义添加/删除，主面板的"复制选项"始终固定显示第一个环境的名称；点击复制时，环境字段取自页面 URL 匹配，导致开发者在 `localhost` 下调试时无法正确获取当前环境。

## 变更内容

### 1. 环境固定为 4 个

设置页环境配置改为固定 4 个，用户只需填写对应 URL：

| 环境   | 预设 ID      | 说明             |
|--------|-------------|------------------|
| LOCAL  | `env-local` | 本地开发环境      |
| FAT    | `env-fat`   | 功能验收测试环境  |
| UAT    | `env-uat`   | 用户验收测试环境  |
| PROD   | `env-prod`  | 生产环境          |

- 名称固定不可编辑，URL 可选填写
- 未填写的环境不会验证 URL 格式，也不会影响功能

### 2. 环境动态检测

主面板展示的环境标签、复制内容中的环境字段，统一按以下优先级决定：

1. **请求响应头 `x-forwarded-for`**（优先级最高）
   - 遍历所有已捕获的 API 请求
   - 检查每个请求的 `x-forwarded-for` 响应头值
   - 值含 `.fat.` → FAT
   - 值含 `.uat.` → UAT
   - 值含 `.pro.` → PROD
2. **请求 URL 降级检测**
   - 若没有请求、或所有请求的 `x-forwarded-for` 都不含标记
   - 则检查请求 URL 是否含上述标记
3. **页面 URL 匹配**
   - 以上均未命中时，尝试通过当前页面 URL origin 匹配已配置环境
4. **默认 PROD**
   - 有请求且无标记命中 → PROD

### 3. 复制输出格式

- 环境有对应 URL 配置：`- 环境FAT：https://saas-gw.fat.supermonkey.cc/path`
- 环境无对应 URL 配置（如 PROD 未填 URL）：`- 环境：PROD`

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/lib/quick-copy/settings.ts` | 固定 4 个环境常量，`sanitizeEnvironments` 合并保存的 URL |
| `src/lib/quick-copy/url.ts` | 新增 `detectEnvironmentFromRequests`，环境标记常量，`ENV_HEADER_KEY` |
| `src/lib/quick-copy/feedback.ts` | 环境输出兼容无 URL 场景 |
| `src/pages/popup/Popup.tsx` | `selectedEnvironment` 优先走请求检测，降级 URL 匹配 |
| `src/pages/popup/components/PopupBody.tsx` | 透传 `selectedEnvironment`，移除环境管理 props |
| `src/pages/popup/components/RequestParamsPanel.tsx` | 使用动态环境名称替换 `environments[0].name` |
| `src/pages/popup/components/SettingsPanel.tsx` | 4 个固定环境行，名称只读 URL 可编辑 |
| `src/pages/popup/hooks/usePopupSettingsState.ts` | 移除 `addEnvironment`/`removeEnvironment`/`moveEnvironment` |
| `src/pages/popup/utils/settings-form.ts` | 环境验证仅校验已填 URL 格式 |
| `src/pages/popup/index.css` | 新增 `.note-input-static` 样式 |
