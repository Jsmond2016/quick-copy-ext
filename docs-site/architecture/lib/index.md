# 核心库

`src/lib/quick-copy/` 是 Popup 和 Background 共享的核心业务逻辑层。

## 设计原则

该层遵循以下设计原则：

- **纯函数优先**：工具函数尽量保持无副作用
- **类型明确**：所有共享数据结构在 `types.ts` 中统一定义
- **无 UI 偏见**：不引用任何视图层代码
- **职责单一**：每个模块聚焦一个业务领域

## 模块一览

| 模块 | 职责 | 关键导出 |
|------|------|---------|
| [类型系统](/architecture/lib/types) | 所有共享 TypeScript 类型 | `NetworkRequestRecord`, `QuickCopySettings` 等 |
| [反馈文本生成](/architecture/lib/feedback) | 复制内容的格式化组装 | `buildFeedbackText()`, `buildWebOnlyText()` |
| [URL 工具函数](/architecture/lib/url) | URL 解析、匹配、格式化 | `matchesMonitoredOrigins()`, `matchesApiPrefixes()` |
| [Apifox 解析](/architecture/lib/apifox) | OpenAPI Schema 解析和查找 | `buildApifoxLookupMaps()` |
| [响应规则引擎](/architecture/lib/response-rules) | 规则解析、评估、校验 | `evaluateResponseErrorRule()` |
| [配置管理](/architecture/lib/settings) | 配置加载、保存、规范化 | `loadSettings()`, `saveSettings()` |
