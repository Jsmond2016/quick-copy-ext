# Apifox 解析

## 概述

`src/lib/quick-copy/apifox.ts` 提供 Apifox OpenAPI Schema 的解析和查找索引构建能力。

## 核心函数

### buildApifoxLookupMaps()

解析 OpenAPI Schema 并构建最小化的查找索引：

```typescript
function buildApifoxLookupMaps(
  schema: OpenAPIObject
): ApifoxLookupMaps | null
```

**返回值 `ApifoxLookupMaps`**：

```typescript
interface ApifoxLookupMaps {
  endpointMap: Map<string, string>;   // "方法+路径" → Apifox URL
  pathMap: Map<string, string>;      // "路径" → Apifox URL
  endpointNameMap: Map<string, string>; // "方法+路径" → 接口名称
  endpointCount: number;             // 索引的接口总数
}
```

## 索引构建

1. 遍历 OpenAPI Schema 中的 `paths` 对象
2. 对每个路径的每个方法，提取：
   - 接口 URL（从 `x-run-in-apifox` 字段获取，去掉 `-run` 后缀）
   - 接口名称（从 `summary` 或 `operationId` 获取）
3. 同时写入三个 Map，避免中间数组

## Apifox URL 清理

- 保留 `x-run-in-apifox` 中的完整 URL
- 移除 URL 末尾的 `-run` 后缀
- 移除 URL 中的 `/web/` 路径段（兼容新版 Apifox）
- 最终格式：`https://app.apifox.com/project/{projectId}/apis/api-{apiId}`
