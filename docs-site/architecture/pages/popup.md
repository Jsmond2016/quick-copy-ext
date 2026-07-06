# 弹窗 UI (Popup)

## 概述

Popup 是扩展的主要用户界面，使用 React 19 构建，通过 `@vitejs/plugin-react` 在 Vite 中编译。当用户点击浏览器工具栏中的扩展图标时，弹出面板显示。

## 技术栈

| 技术 | 用途 |
|------|------|
| React 19 | UI 框架 |
| ahooks | React hooks 工具库（useMount、useRequest、useBoolean 等） |
| webextension-polyfill | 浏览器 API 兼容层 |
| CSS | 原生 CSS（无 UI 组件库） |

## 页面布局

```
┌─────────────────────────────────────┐
│  PopupHero                          │
│  页面标题/URL · Apifox 状态 · 设置  │
├─────────────────────────────────────┤
│  RequestHistoryPanel                │
│  请求列表 · 过滤摘要 · 多选操作     │
├─────────────────────────────────────┤
│  RequestParamsPanel (可选)          │
│  复制选项开关                       │
├─────────────────────────────────────┤
│  NotePanel                          │
│  备注输入 · 快速模板 · 复制按钮     │
├─────────────────────────────────────┤
│  PopupFooter                        │
│  版本 · 版权                        │
└─────────────────────────────────────┘
```

## 组件职责

| 组件 | 职责 |
|------|------|
| `Popup.tsx` | 页面编排：状态管理、主流程编排、数据加载 |
| `PopupHero.tsx` | 顶部品牌区、Apifox 状态指示、设置入口 |
| `PopupBody.tsx` | 主内容切换（功能视图 / 设置视图） |
| `RequestHistoryPanel.tsx` | 请求列表展示、过滤、多选、滚动 |
| `RequestParamsPanel.tsx` | 复制选项配置（入参、环境等） |
| `NotePanel.tsx` | 备注输入、快速模板选择、复制/操作按钮 |
| `SettingsPanel.tsx` | 完整设置表单 |
| `ScrollNavFab.tsx` | 滚动导航浮动按钮 |
| `ToastMessage.tsx` | 操作反馈提示 |

## 自定义 Hooks

| Hook | 职责 |
|------|------|
| `useTabRequests()` | 从后台加载请求、Apifox 匹配、异常评估、实时更新 |
| `useApifox()` | Apifox 状态管理、刷新操作 |
| `usePopupFeedbackActions()` | 复制反馈、AIO 复制、Quick Mock 操作 |
| `usePopupSettingsState()` | 设置表单状态管理 |
| `useSelection()` | 请求多选逻辑（含 Shift 键范围选择） |
| `useToast()` | Toast 生命周期管理 |
| `useScrollNav()` | 滚动状态检测 |

## 三种模式

| 模式 | 设置值 | 特点 |
|------|--------|------|
| 默认模式 | `default` | 基础复制功能 |
| 开发者模式 | `developer` | 增加"快速 Mock"按钮 |
| 测试者模式 | `tester` | 显示"复制到 AIO"按钮 + 迭代选择器 |
