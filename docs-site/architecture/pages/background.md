# 后台 Service Worker

## 概述

后台 Service Worker（`src/pages/background/`）是扩展的核心引擎，负责请求监听、数据缓存、消息处理和 Apifox 刷新。

## 模块分解

### index.ts — 入口和主控

负责：

- **请求跟踪管理**：维护 `Map<tabId, NetworkRequestRecord[]>`（每 tab 最多 200 条）
- **快速查找索引**：`requestIndex` Map，通过 requestId 直接定位请求
- **标签页生命周期**：监听 `tabs.onRemoved` 清理缓存，`tabs.onUpdated` 更新 URL
- **会话持久化**：使用 `chrome.storage.session` 跨 Service Worker 重启保留数据，版本化序列化格式
- **设置监听**：监听 `storage.onChanged`，在设置变更时重新加载受监控来源
- **启动恢复**：从会话缓存恢复、加载来源配置、遍历所有标签页建立监听

### request-events.ts — 请求事件监听

注册三个 `chrome.webRequest` 监听器：

| 事件 | 行为 |
|------|------|
| `onBeforeRequest` | 请求发起时创建 `NetworkRequestRecord`，过滤 `xmlhttprequest` / `fetch` 类型 |
| `onCompleted` | 请求完成时更新状态码、耗时、响应头，计算异常状态 |
| `onErrorOccurred` | 请求失败时记录错误信息 |

请求根据 `monitoredOrigins` 配置进行过滤，仅匹配的请求会被记录。

### runtime-messages.ts — 消息处理

注册 `chrome.runtime.onMessage` 监听器，处理来自 Popup 和 Content Script 的所有消息：

| 消息类型 | 说明 |
|---------|------|
| `get-tab-requests` | 返回指定 tab 的请求列表 |
| `clear-tab-requests` | 清空 tab 的请求记录 |
| `get-apifox-status` | 返回 Apifox 缓存状态 |
| `refresh-apifox-data` | 触发 Apifox 数据刷新 |
| `clear-apifox-data` | 清除 Apifox 缓存 |
| `get-apifox-matches` | 为请求列表计算 Apifox 匹配结果 |
| `report-response-body` | 接收内容脚本上报的响应体 |

### response-capture.ts — 响应体捕获匹配

将内容脚本上报的响应体匹配到对应的请求记录：

1. 按 URL、方法、时间戳（15 秒窗口）匹配请求
2. 生成响应快照（裁剪后）
3. 评估异常规则
4. 回填到请求记录

### apifox-matches.ts — Apifox 匹配

提供请求与 Apifox 接口的匹配能力：

- 优先使用 endpointMap（方法+路径）精确匹配
- 未命中时使用 pathMap（仅路径）回退匹配
- 返回 Apifox 链接和接口名称
