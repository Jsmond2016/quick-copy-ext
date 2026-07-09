# 响应规则引擎

## 概述

`src/lib/quick-copy/response-rules.ts` 提供响应异常规则的解析、评估和校验能力。

## 核心函数

### parseResponseErrorRuleConfig()

解析 JSON 字符串配置为规则数组：

```typescript
function parseResponseErrorRuleConfig(
  config: string
): ResponseErrorRuleEntry[] | undefined
```

### evaluateResponseErrorRule()

评估单条规则表达式：

```typescript
function evaluateResponseErrorRule(
  response: JsonValue,
  expression: string
): boolean
```

### getMatchedResponseErrorRules()

获取匹配规则的有序列表（首条命中即停）：

```typescript
function getMatchedResponseErrorRules(
  ruleEntries: ResponseErrorRuleEntry[],
  response: JsonValue
): ResponseErrorRuleEntry[]
```

### sanitizeResponseSnapshot()

裁剪响应体为安全的快照格式：

```typescript
function sanitizeResponseSnapshot(
  data: unknown
): JsonValue
```

### isValidResponseErrorRuleConfig()

校验规则配置的合法性：

```typescript
function isValidResponseErrorRuleConfig(
  config: string
): boolean
```

## 表达式解析

规则表达式支持：

- **字段路径**：`res.rtn`、`res.data.list`、`res.data?.list?.length`
- **比较运算符**：`===`、`!==`、`==`、`!=`、`>`、`<`、`>=`、`<=`
- **逻辑运算符**：`&&`
- **字面量**：字符串、数字、`null`、`true`、`false`

表达式被解析为 `{ path, operator, value }` 三元组，然后在响应快照上通过路径取值后比较。
