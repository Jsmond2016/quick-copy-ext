# 配置管理

## 概述

`src/lib/quick-copy/settings.ts` 提供配置的加载、保存、规范化和默认值管理。

## 核心函数

### loadSettings()

从 `chrome.storage.sync` 加载配置：

```typescript
function loadSettings(): Promise<QuickCopySettings>
```

- 读取存储中的配置
- 合并默认值（缺失字段自动补充）
- 处理历史数据兼容（如旧版 `developerMode` 布尔值 → `mode` 字符串）
- 返回完整的 `QuickCopySettings` 对象

### saveSettings()

保存配置到 `chrome.storage.sync`：

```typescript
function saveSettings(settings: QuickCopySettings): Promise<void>
```

### normalizeSettings()

规范化配置（填充缺失字段、兼容旧版数据）：

```typescript
function normalizeSettings(
  raw: Partial<QuickCopySettings>
): QuickCopySettings
```

## 默认值

| 字段 | 默认值 |
|------|--------|
| `feedbackTitle` | `"页面接口信息如下"` |
| `monitoredOrigins` | `["localhost", "127.0.0.1"]` |
| `apiPrefixes` | `["/api/saas/"]` |
| `customFields` | `[]` |
| `quickFillTemplates` | `[]` |
| `apifoxExportUrl` | `""` |
| `apifoxAuthToken` | `""` |
| `responseErrorRule` | `[{"label":"接口异常","expression":"res.rtn !== 0"}]` |
| `mode` | `"default"` |
| `quickMockTargetExtensionId` | `""` |
| `testerAioConfigs` | `[]` |
| `environments` | `[]` |
