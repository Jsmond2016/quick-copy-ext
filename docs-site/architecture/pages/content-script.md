# 内容脚本

## 概述

内容脚本（`src/pages/content/index.ts`）负责在用户访问的页面中注入辅助脚本，以捕获接口的响应体数据。

## 工作原理

### 1. 注入页面钩子

内容脚本创建一个 `<script>` 标签，`src` 指向 `chrome.runtime.getURL('page-network-hook.js')`，将其注入到当前页面的 DOM 中。

由于 Content Script 运行在隔离的 JavaScript 环境中，无法直接访问页面上下文中的 `fetch` 和 `XMLHttpRequest` 原型。因此需要将 `page-network-hook.js` 注入到页面本身的 JS 上下文中。

### 2. 页面钩子脚本

`public/page-network-hook.js` 被注入到页面 JS 上下文后：

- 覆写 `window.fetch`，拦截所有 `fetch()` 调用
- 覆写 `XMLHttpRequest.prototype.open` 和 `send`
- 捕获请求参数（格式化 URLSearchParams，限制 Blob/FormData）
- 序列化响应体（递归裁剪：深度 3 层，数组 10 项，对象 20 个 key，字符串 300 字符）
- 通过 `window.postMessage` 将有效载荷发送回内容脚本

### 3. 数据转发

内容脚本监听 `window.postMessage` 事件，过滤消息来源 `quick-copy-ext-page-hook`：

- 接收页面钩子上报的响应体数据
- 通过 `chrome.runtime.sendMessage` 转发到后台 Service Worker
- 消息类型：`quick-copy/report-response-body`

### 4. 响应体匹配

后台 Service Worker 收到上报数据后：

1. 按 URL、方法、时间戳进行匹配（15 秒窗口）
2. 对最近的请求按时间排序，选择最接近的
3. 将响应体写入请求记录
4. 重新评估异常规则

## 架构图

```
页面 JS 上下文
   │
   ├── page-network-hook.js (注入)
   │   ├── 覆写 window.fetch
   │   └── 覆写 XMLHttpRequest
   │
   ├── 捕获请求/响应
   │
   └── window.postMessage({source:"quick-copy-ext-page-hook",...})
          │
          ▼
Content Script (隔离环境)
   │
   └── chrome.runtime.sendMessage({type:"quick-copy/report-response-body",...})
          │
          ▼
Background Service Worker
   ├── 匹配请求记录
   ├── 写入响应快照
   └── 重新评估异常规则
```
