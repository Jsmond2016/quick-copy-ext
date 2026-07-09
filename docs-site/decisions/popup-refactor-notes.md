# Popup 组件重构思路记录

## 背景

`src/pages/popup/Popup.tsx` 在重构前承担了过多职责：

- 页面级状态管理
- Chrome runtime / tabs 通信
- 设置表单输入处理
- Apifox 刷新与错误处理
- toast 生命周期管理
- 页面摘要、请求列表、备注区、设置区等多块 UI 渲染

这些逻辑全部堆在一个文件里，带来几个直接问题：

- 文件过长，阅读成本高
- 修改某一块功能时容易影响其他逻辑
- UI 和业务逻辑耦合，复用困难
- 后续新增功能时 `Popup.tsx` 会继续膨胀

## 重构目标

这次重构不是为了"拆文件而拆文件"，而是让 popup 页面按职责分层：

- 主组件只保留页面级编排逻辑
- 通信逻辑独立，避免散落在 UI 中
- 表单转换逻辑集中，避免重复处理
- 视觉区块拆成独立组件，降低单文件复杂度
- 公共常量、类型、轻量 hooks 单独归档

## 重构原则

### 1. 先按职责边界拆

有些逻辑虽然代码量不大，但职责很明确，如 runtime 消息发送、toast 自动消失、settings 表单转换。这类逻辑即使不长，也适合单独抽出。

### 2. 主组件保留"编排"，子模块负责"实现细节"

`Popup.tsx` 仍然保留页面级逻辑（初始化、状态管理、主流程），但具体实现移出（通信、转换、JSX）。

### 3. 先做稳定拆分，再考虑进一步抽 hook

优先拆稳定边界：components、services、utils、constants、hooks。没有一步到位把所有 handler 抽成大 hook。

## 目录拆分方案

重构后的结构：

```text
src/pages/popup/
  Popup.tsx                 # 主组件（页面编排）
  components/               # UI 组件
    NotePanel.tsx
    PageSummaryPanel.tsx
    PopupHero.tsx
    RequestHistoryPanel.tsx
    SettingsPanel.tsx
    ToastMessage.tsx
  constants.ts              # 常量
  hooks/
    useToast.ts             # Toast 生命周期
  services/
    runtime.ts              # 通信层
  types.ts                  # 类型
  utils/
    settings-form.ts        # 表单转换
```

## 各模块职责

### Popup.tsx

初始化加载、请求选择、保存设置、复制反馈等主流程编排。

### services/runtime.ts

封装 `chrome.runtime.sendMessage` 调用，统一错误处理。

### utils/settings-form.ts

处理 `QuickCopySettings` 与 `SettingsFormState` 之间的双向转换。

### hooks/useToast.ts

Toast 自动消失逻辑，独立管理。

### Components

按视觉区块拆分，每个组件负责各自的展示和交互。

## 后续可优化的方向

1. **抽 usePopupController**：将页面级状态和 handler 统一放入 hook
2. **RequestCard 组件**：请求列表项独立成组件
3. **设置项配置化**：将设置字段定义抽成 schema
