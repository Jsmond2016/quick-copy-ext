# 类型系统

> **更新时间**：2026-07-14；**使用模型**：Codex（GPT-5）；**用户**：Jsmond2016

---

## 概述

扩展的类型系统定义在 `src/lib/quick-copy/types.ts` 中，是所有共享数据结构的来源。

## 核心类型

### NetworkRequestRecord — 网络请求记录

```typescript
interface NetworkRequestRecord {
  id: string;                 // 唯一标识
  requestId: string;          // Chrome 请求 ID
  tabId: number;              // 标签页 ID
  url: string;                // 请求 URL
  method: string;             // HTTP 方法（GET/POST等）
  type: string;               // 请求类型（xmlhttprequest/fetch）
  statusCode?: number;        // HTTP 状态码
  initiator?: string;         // 发起者 URL
  startedAt: number;          // 请求开始时间戳
  completedAt?: number;       // 请求完成时间戳
  headers: Record<string, string>; // 请求头（含 traceId）
  error?: string;             // 错误信息
  apifoxUrl?: string;         // Apifox 链接
  apiName?: string;           // Apifox 接口名称
  responseSnapshot?: JsonValue; // 响应体快照（裁剪后）
  responseRuleMatched?: boolean; // 是否命中异常规则
  responseMessage?: string;   // 异常规则命中说明
  abnormalReasons?: string[]; // 异常原因列表
  requestParams?: Record<string, unknown>; // 请求参数
}
```

### QuickCopySettings — 设置

```typescript
interface QuickCopySettings {
  feedbackTitle: string;              // 反馈标题
  monitoredOrigins: string[];         // 监听域名
  apiPrefixes: string[];              // 接口前缀过滤
  customFields: string[];             // 自定义字段
  quickFillTemplates: string[];       // 快速填入模板
  apifoxExportUrl: string;            // Apifox 导出配置
  apifoxAuthToken: string;            // Apifox 认证令牌
  responseErrorRule: string;          // 异常响应规则（JSON）
  mode: 'default' | 'developer' | 'tester'; // 操作模式
  quickMockTargetExtensionId: string; // Quick Mock 扩展 ID
  testerAioConfigs: TesterAioConfig[]; // AIO 配置
  environmentGroups: EnvironmentGroupConfig[]; // 多套环境配置
}
```

`EnvironmentGroupConfig` 表示一套项目环境，每组包含 LOCAL、FAT、UAT、PROD 四个 `EnvironmentConfig`。配置规范化会补齐缺失槽位，并兼容旧版单组 `environments` 数据。

### 消息协议类型

```typescript
// Popup → Background 请求消息
type RuntimeRequestMessage =
  | { type: 'quick-copy/get-tab-requests'; tabId: number }
  | { type: 'quick-copy/clear-tab-requests'; tabId: number }
  | { type: 'quick-copy/get-apifox-status' }
  | { type: 'quick-copy/refresh-apifox-data'; exportUrl: string; authToken: string }
  | { type: 'quick-copy/clear-apifox-data' }
  | { type: 'quick-copy/get-apifox-matches'; requests: ... }
  | { type: 'quick-copy/report-response-body'; payload: CapturedResponsePayload };

// Background → Popup 事件消息
type RuntimeEventMessage = {
  type: 'quick-copy/tab-requests-updated';
  tabId: number;
};

// 响应消息
type RuntimeResponseMessage =
  | { ok: true; data: NetworkRequestRecord[] }
  | { ok: false; error: string };
```

### 其他关键类型

| 类型 | 说明 |
|------|------|
| `CapturedResponsePayload` | 页面钩子捕获的响应体数据 |
| `PageSummary` | 页面基本信息（title + url） |
| `ApifoxCacheStatus` | Apifox 缓存状态 |
| `ApifoxLookupMaps` | Apifox 查找索引（endpointMap, pathMap, endpointNameMap） |
| `ApifoxMatchResult` | Apifox 匹配结果（url + 接口名） |
| `TesterAioConfig` | 测试者 AIO 配置（迭代名称 + 提交 URL） |
| `EnvironmentConfig` | 环境配置（环境名称 + 基础 URL） |
| `EnvironmentGroupConfig` | 环境配置组（组名 + 四个固定环境槽位） |
| `ResponseErrorRuleEntry` | 异常规则条目（label + expression） |
