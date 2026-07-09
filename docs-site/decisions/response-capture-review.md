# 后台响应采集改造

> **编写时间**：2026-06-01；**使用模型**：GPT-5 Codex

## 背景

改动主要集中在响应体采集、响应快照清洗和后台侧的调试排查能力上，涉及 3 个文件：

- `public/page-network-hook.js`
- `src/lib/quick-copy/response-rules.ts`
- `src/pages/background/index.ts`

## 主要改动

### 1. 数组清洗逻辑调整

当数组元素在递归清洗后全部变为 `undefined` 时，用 `[null]` 代替 `[]`，保留"原始数组有内容"的信号。

### 2. 运行时缓存增加版本号

在 session cache 中新增 `version` 字段，引入 `RUNTIME_CACHE_VERSION = 2`。版本不一致时自动清除旧缓存，避免残留数据干扰新逻辑。

### 3. 后台开始跟踪 fetch

`TRACKED_RESOURCE_TYPES` 从仅包含 `xmlhttprequest` 调整为同时包含 `fetch`，使页面钩子回传的响应体更容易匹配到请求记录。

### 4. 增强调试日志

- 新增 `getResponseDebugSummary` 辅助函数
- 未匹配到请求时输出日志
- 匹配成功时输出响应快照和命中规则

## 验证方向

1. fetch 请求能被正确捕获和展示
2. 响应数组元素被裁剪后标记为 `[null]` 而非空数组
3. 旧 session cache 在版本变更后自动清理
4. 短时间内同一接口连续请求多次，响应回填到正确记录
