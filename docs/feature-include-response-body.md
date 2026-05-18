# 包含接口出参功能 - 问题记录

## 问题 1：接口出参值为空

### 现象

勾选「包含接口出参」后复制，输出的接口出参内容为空或 list 数据丢失。例如实际响应有 15 条数据，复制结果中 `list: []`。

### 根因

1. **content script 注入时机过晚**：manifest 未指定 `run_at`，默认 `document_idle`，导致 page hook 在页面脚本发起请求之后才注入，无法拦截早期请求的响应体。
2. **双重截断**：page-network-hook.js 的 `sanitizeValue` 先以 depth > 3 截断，background 的 `sanitizeResponseSnapshot` 再以 depth >= 3 截断，导致 `data.list` 中的 item（depth 3）被直接丢弃为 undefined，过滤后变成空数组。
3. **数组长度限制过小**：原先 slice(0, 10) 只保留前 10 项，超出部分被丢弃。

### 修复

- manifest.json 添加 `"run_at": "document_start"`，确保 page hook 在页面脚本执行前注入
- 移除 background 中的二次 `sanitizeResponseSnapshot` 调用，page hook 已做过一次清洗
- 深度限制从 3 提升到 6，数组从 10 项提升到 50 项，对象 key 从 20 提升到 30
- 当 `includeResponseBody` 为 true 但 `responseSnapshot` 为空时，输出「未捕获到响应体」而非静默跳过

## 问题 2：两个 checkbox 分行显示

### 现象

「包含接口入参」和「包含接口出参」各占一行，预期在同一行。

### 修复

用 `.checkbox-row-group` 容器包裹，`display: flex` 横向排列。

## 补充：缓存容量提醒

由于提升了 sanitize 限制，单条请求的 responseSnapshot 体积会增大。新增 session storage 用量检测，超过 80% 时 toast 提醒用户清空历史记录。
