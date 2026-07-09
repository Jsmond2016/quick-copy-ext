# 架构设计

Quick Copy Ext 遵循 Chrome Extension Manifest V3 标准架构，由多个独立的页面模块协同工作。

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│                  Background SW                      │
│  (src/pages/background/)                            │
│  请求监听 · 缓存管理 · 消息处理 · Apifox 刷新       │
└────────────┬──────────────┬──────────────────────────┘
             │              │
    chrome.runtime     chrome.storage
    .sendMessage       .session/.sync
             │              │
┌────────────▼──────┐ ┌────▼──────────────────────────┐
│   Popup (React)   │ │   Content Script              │
│   src/pages/popup │ │   src/pages/content           │
│   用户交互界面     │ │   注入页面脚本 · 捕获响应体   │
└───────────────────┘ └───────────────────────────────┘
                              │
                     window.postMessage
                              │
                    ┌─────────▼──────────┐
                    │  page-network-hook  │
                    │  (注入到页面)        │
                    │  拦截 fetch/XHR     │
                    └────────────────────┘
```

## 核心分层

| 层级 | 位置 | 职责 |
|------|------|------|
| **后台 Service Worker** | `src/pages/background/` | 请求监听、数据缓存、消息路由、Apifox 刷新 |
| **内容脚本** | `src/pages/content/` | 注入页面脚本、捕获响应体并转发 |
| **页面钩子** | `public/page-network-hook.js` | 拦截 `fetch`/`XMLHttpRequest`，提取响应体 |
| **Popup UI** | `src/pages/popup/` | React 19 应用，用户交互主界面 |
| **核心库** | `src/lib/quick-copy/` | 共享逻辑层（类型、工具、格式化、配置） |

## 相关页面

- [项目结构](/architecture/project-structure) — 完整的目录文件结构说明
- [数据流说明](/architecture/data-flow) — 从请求捕获到复制反馈的完整链路
- [后台 Service Worker](/architecture/pages/background) — 服务工作者模块详解
- [内容脚本](/architecture/pages/content-script) — 内容脚本模块详解
- [弹窗 UI](/architecture/pages/popup) — Popup UI 模块详解
- [侧边栏](/architecture/pages/sidepanel) — 侧边面板说明
