# 完整配置项参考

## QuickCopySettings

扩展的所有配置通过 `QuickCopySettings` 对象管理，通过 `chrome.storage.sync` 持久化。

### 基础配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `feedbackTitle` | `string` | `"页面接口信息如下"` | 复制反馈内容中的标题文字 |
| `mode` | `string` | `"default"` | 操作模式：`default` / `developer` / `tester` |

### 请求监控

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `monitoredOrigins` | `string[]` | `["localhost","127.0.0.1"]` | 需要监听请求的域名，支持 `*.example.com` 通配 |
| `apiPrefixes` | `string[]` | `["/api/saas/"]` | 接口路径前缀过滤，仅展示匹配的请求 |

### 反馈内容

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `customFields` | `string[]` | `[]` | 自定义字段，如 `"反馈人-张三"` |
| `quickFillTemplates` | `string[]` | `[]` | 快速填入模板，预设备注模板内容 |

### Apifox 配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `apifoxExportUrl` | `string` | `""` | Apifox 项目 ID 或完整导出 URL |
| `apifoxAuthToken` | `string` | `""` | Apifox Online API 的 Bearer Token |

### 异常规则

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `responseErrorRule` | `string` | `[{"label":"接口异常","expression":"res.rtn !== 0"}]` | 异常响应规则（JSON 字符串） |

### 开发者模式

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `quickMockTargetExtensionId` | `string` | `""` | Quick Mock 目标扩展 ID |

### 测试者模式

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `testerAioConfigs` | `TesterAioConfig[]` | `[]` | AIO 配置（迭代名称 + Bug 提交 URL） |

### 环境配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `environments` | `EnvironmentConfig[]` | `[]` | 环境定义（环境名称 + 基础 URL） |

## 配置类型

```typescript
interface QuickCopySettings {
  feedbackTitle: string;
  monitoredOrigins: string[];
  apiPrefixes: string[];
  customFields: string[];
  quickFillTemplates: string[];
  apifoxExportUrl: string;
  apifoxAuthToken: string;
  responseErrorRule: string;
  mode: 'default' | 'developer' | 'tester';
  quickMockTargetExtensionId: string;
  testerAioConfigs: TesterAioConfig[];
  environments: EnvironmentConfig[];
}

interface TesterAioConfig {
  id: string;
  iterationName: string;
  bugUrl: string;
}

interface EnvironmentConfig {
  id: string;
  name: string;
  url: string;
}
```
