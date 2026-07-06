# 侧边栏

## 概述

侧边面板（`src/pages/sidepanel/`）是 Chrome 侧边栏 API 的实验性实现。它复用了 Popup 的完整 UI，通过独立的 HTML 入口加载。

## 与 Popup 的关系

侧边面板与 Popup 共享同一套组件代码：

```
src/pages/popup/  ─── 组件/Popup.tsx  ─── 完整 UI
       │                                        │
       │                                  复用组件
       │                                        │
       ▼                                        ▼
src/pages/sidepanel/index.html ──────── 渲染 Popup 组件
```

## 差异点

- CSS 调整为适应侧边栏尺寸：`html, body { width: 100%; min-height: 100vh; }`
- 用户体验与 Popup 完全相同

> 注意：侧边栏目前是实验性功能，建议优先使用 Popup 交互形式。
