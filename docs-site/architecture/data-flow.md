# 数据流说明

## 完整数据链路

从页面发起请求到用户复制反馈，数据经过以下完整链路：

### 1. 请求捕获阶段

```
页面发起请求 (XHR/fetch)
         │
         ├── chrome.webRequest.onBeforeRequest
         │      └── background: 创建 NetworkRequestRecord
         │
         ├── chrome.webRequest.onCompleted / onErrorOccurred
         │      └── background: 更新状态码、耗时、异常状态
         │
         └── page-network-hook.js (注入页面)
                └── 拦截 fetch/XHR 响应体
                       └── window.postMessage → content script
                              └── chrome.runtime.sendMessage → background
                                     └── 匹配请求记录，回填 responseSnapshot
```

### 2. 数据缓存阶段

```
background (内存缓存)
  ├── requestsByTab: Map<tabId, NetworkRequestRecord[]>
  ├── requestIndex: Map<requestId, NetworkRequestRecord>
  ├── tabUrlMap: Map<tabId, string>
  └── apifoxLookupMaps: { endpointMap, pathMap, endpointNameMap }
         │
         └── chrome.storage.session (持久化)
                └── Service Worker 重启后恢复
```

### 3. 数据展示阶段

```
用户点击扩展图标
         │
         └── popup 打开
                ├── chrome.runtime.sendMessage('get-tab-requests')
                │      └── background: 返回当前 tab 的请求记录
                │
                ├── chrome.runtime.sendMessage('get-apifox-status')
                │      └── background: 返回 Apifox 缓存状态
                │
                ├── chrome.runtime.sendMessage('get-apifox-matches')
                │      └── background: 返回请求的 Apifox 匹配结果
                │
                └── popup 渲染
                       ├── 过滤 (apiPrefixes)
                       ├── 选择状态管理
                       └── 异常规则评估
```

### 4. 复制阶段

```
用户点击"复制"
         │
         └── popup 组装文本
                ├── buildFeedbackText()
                │   ├── 页面信息 (URL, Title)
                │   ├── 环境信息
                │   ├── 勾选的接口详情
                │   │   ├── 方法、路径
                │   │   ├── traceId、状态码
                │   │   ├── 耗时、时间
                │   │   ├── Apifox 链接
                │   │   └── 入参 (可选)
                │   ├── 备注
                │   └── 自定义字段
                │
                └── navigator.clipboard.writeText()
                       └── 写入剪贴板 → 用户粘贴使用
```

## 消息协议

Popup 与 Background 之间通过 `chrome.runtime.sendMessage` 通信，消息类型在 `types.ts` 中定义为联合类型：

| 消息类型 | 方向 | 说明 |
|---------|------|------|
| `quick-copy/get-tab-requests` | Popup → Background | 获取指定 tab 的请求列表 |
| `quick-copy/clear-tab-requests` | Popup → Background | 清空指定 tab 的请求记录 |
| `quick-copy/get-apifox-status` | Popup → Background | 获取 Apifox 缓存状态 |
| `quick-copy/refresh-apifox-data` | Popup → Background | 触发 Apifox 数据刷新 |
| `quick-copy/clear-apifox-data` | Popup → Background | 清除 Apifox 缓存 |
| `quick-copy/get-apifox-matches` | Popup → Background | 获取请求的 Apifox 匹配结果 |
| `quick-copy/report-response-body` | Content → Background | 上报捕获的响应体 |
| `quick-copy/tab-requests-updated` | Background → Popup | 请求记录更新通知（事件） |
