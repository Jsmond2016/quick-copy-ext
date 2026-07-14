# 项目结构

> **更新时间**：2026-07-14；**使用模型**：Codex（GPT-5）；**用户**：Jsmond2016

---

## 根目录

```text
quick-copy-ext/
├── src/                          # 源代码
│   ├── lib/quick-copy/           # 共享核心逻辑
│   ├── pages/                    # 扩展页面模块
│   │   ├── background/           # 后台 Service Worker
│   │   ├── content/              # 内容脚本
│   │   ├── popup/                # 弹窗 UI (React)
│   │   └── sidepanel/            # 复用 Popup 的侧边面板入口
│   ├── global.d.ts               # 全局类型声明
│   └── vite-env.d.ts             # Vite 环境类型声明
├── public/                       # Web 可访问资源
├── dist_chrome/                  # Chrome 构建产物
├── docs-site/                    # VitePress 文档站点
├── docs/                         # 原始文档
├── scripts/                      # 构建/发布脚本
└── .github/                      # GitHub Actions / Issue 模板
```

## 核心库结构

```text
src/lib/quick-copy/
├── index.ts         # 桶文件，统一导出
├── types.ts         # 所有共享 TypeScript 类型
├── constants.ts     # 应用常量（最大请求数、存储键等）
├── settings.ts      # 配置加载/保存/规范化
├── feedback.ts      # 反馈文本组装生成
├── url.ts           # URL 解析/格式化/匹配
├── apifox.ts        # Apifox OpenAPI 解析
└── response-rules.ts # 响应异常规则引擎
```

## Popup UI 结构

```text
src/pages/popup/
├── index.html
├── index.tsx         # React 入口
├── index.css         # 全局样式
├── Popup.tsx         # 主组件（页面编排）
├── constants.ts      # Popup 专属常量
├── types.ts          # Popup 专属类型
├── components/       # UI 组件
│   ├── PopupHero.tsx         # 顶部品牌区
│   ├── PopupBody.tsx         # 主内容区
│   ├── PopupFooter.tsx       # 页脚
│   ├── PageSummaryPanel.tsx  # 页面摘要
│   ├── RequestHistoryPanel.tsx # 请求列表
│   ├── RequestParamsPanel.tsx  # 请求参数面板
│   ├── NotePanel.tsx         # 备注输入区
│   ├── SettingsPanel.tsx     # 设置面板
│   ├── ConfigModal.tsx       # 配置导入/导出弹窗
│   ├── ScrollNavFab.tsx      # 滚动导航按钮
│   └── ToastMessage.tsx      # Toast 通知
├── hooks/           # 自定义 Hooks
│   ├── useApifox.ts
│   ├── useToast.ts
│   ├── useTabRequests.ts
│   ├── useSelection.ts
│   ├── useScrollNav.ts
│   ├── usePopupFeedbackActions.ts
│   └── usePopupSettingsState.ts
├── services/        # 通信层
│   └── runtime.ts   # chrome.runtime.sendMessage 封装
└── utils/           # 工具函数
    ├── apifox-settings.ts # Apifox 配置变更判断和保存提示
    └── settings-form.ts   # 设置表单与可移植 JSON 配置转换
```

## 后台 Service Worker 结构

```text
src/pages/background/
├── index.ts              # 入口：缓存管理、初始化、消息路由
├── request-events.ts     # webRequest 事件监听
├── response-capture.ts   # 响应体捕获匹配
├── runtime-messages.ts   # 运行时消息处理
└── apifox-matches.ts     # Apifox URL 匹配
```

## 配置/构建文件

| 文件 | 说明 |
|------|------|
| `manifest.json` | Chrome Extension Manifest V3 声明 |
| `package.json` | 项目元数据、依赖、脚本 |
| `vite.config.base.ts` | Vite 共享配置 |
| `vite.config.chrome.ts` | Chrome 构建配置 |
| `vite.config.firefox.ts` | Firefox 构建配置 |
| `tsconfig.json` | TypeScript 编译配置 |
| `commitlint.config.js` | 提交信息规范 |
