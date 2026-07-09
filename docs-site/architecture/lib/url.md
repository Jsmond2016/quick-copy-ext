# URL 工具函数

## 概述

`src/lib/quick-copy/url.ts` 提供 URL 相关的工具函数，包括域名匹配、前缀过滤、环境 URL 生成等。

## 核心函数

### matchesMonitoredOrigins()

判断请求 URL 是否匹配已配置的监听域名：

```typescript
function matchesMonitoredOrigins(url: string, origins: string[]): boolean
```

- 支持精确匹配
- 支持通配符匹配，如 `*.example.com`
- 匹配请求 URL 中的 hostname 部分

### matchesApiPrefixes()

判断请求 URL 路径是否匹配接口前缀过滤规则：

```typescript
function matchesApiPrefixes(url: string, prefixes: string[]): boolean
```

- 检查 URL 的 pathname 部分是否以任一前缀开头
- 用于 popup 展示时的过滤和复制时的范围控制

### 其他工具

| 函数 | 说明 |
|------|------|
| `extractTraceId(headers)` | 从请求/响应头中提取 traceId |
| `buildEnvironmentUrl(baseUrl)` | 构建环境跳转 URL |
| `formatUrlForDisplay(url)` | URL 格式化展示（截断等） |
| `normalizeHeaders(headers)` | 响应头名称规范化（大小写统一） |
