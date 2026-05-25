# AGENTS

本文件面向在本仓库中协作的 AI agent，也适用于新加入项目的开发者。

目标是让任何一次改动都能先快速建立上下文，再以尽量小的风险完成任务。

## 项目概览

Quick Copy Ext 是一个基于 Chrome Extension Manifest V3 的浏览器扩展，用于采集页面信息和接口请求，并生成标准化的异常反馈文本。

当前技术栈：

- React 19
- TypeScript
- Vite
- Chrome Extension Manifest V3
- pnpm

## 目录职责

核心目录如下：

```text
src/
  lib/
    quick-copy.ts         共享类型、格式化、配置、复制文案构建等核心逻辑
  pages/
    background/           后台消息与请求采集逻辑
    content/              内容脚本入口
    popup/                插件弹窗 UI 与交互逻辑
docs/                     项目文档、设计说明、重构记录
```

修改前应先判断改动属于哪一层：

- `popup`：面向用户的弹窗 UI、设置面板、复制交互
- `background`：请求采集、缓存、runtime message 处理
- `lib`：共享类型、通用工具、配置读写、格式化逻辑

优先保持职责边界清晰，不要把某一层的实现细节再次耦合回另一层。

## 工作方式

### 1. 先理解，再修改

开始改动前，先确认：

- 当前需求主要影响哪一层
- 是否已有可复用的工具函数或类型
- 是否会影响 runtime message 协议
- 是否会影响 popup 初始化路径或复制结果格式

避免在未建立上下文时直接大改。

### 2. 优先最小可验证改动

除非用户明确要求重构，否则优先：

- 复用现有结构
- 在现有边界内完成修改
- 减少不必要的文件迁移和 API 变化

如果确实需要重构，应同时满足：

- 当前文件职责明显混杂
- 重构后的边界更清晰
- 行为保持不变或变化非常明确

### 3. 保持分层

推荐的分层方式：

- 页面编排逻辑留在页面组件或页面级 hook
- runtime / tabs / storage 通信优先下沉到 `services` 或 `lib`
- 字符串转换、格式化、表单映射逻辑优先放 `utils` 或 `lib`
- 视觉区块拆成 `components`
- 小型基础类型和默认值可拆到 `types` / `constants`

### 4. 不主动扩大修改面

如果用户只要求修一个 popup 交互，不要顺手：

- 重写整个 popup 架构
- 批量改命名风格
- 搬运大量文件
- 修改发布、构建、CI 配置

除非这些改动是完成任务的必要条件。

## 当前项目现状

目前仓库有几个需要注意的现实情况：

### 1. `src/lib/quick-copy.ts` 是共享核心文件

这个文件里集中了承担较多基础能力的内容，例如：

- 类型定义
- 设置读写
- 过滤逻辑
- 复制文本构建
- Apifox 相关工具

修改它时要特别注意对 popup 和 background 的双向影响。

### 2. `src/pages/background/index.ts` 属于高风险区

这里承接请求采集与 runtime 消息处理，改动时要注意：

- 消息类型与返回类型是否仍一致
- popup 是否还能兼容
- 类型和定时器写法是否兼容当前 TS 环境

### 3. popup 刚完成一轮按职责拆分

当前 popup 已经开始向下面的结构演进：

- `components`
- `services`
- `hooks`
- `utils`
- `constants`

后续改 popup 时，应沿着这个方向继续整理，不要重新把通信、表单转换和大段 JSX 塞回主组件。

## 修改约束

### 1. TypeScript

- 保持 `strict` 模式兼容
- 新增类型优先显式声明
- 不要轻易用 `any`
- 浏览器扩展消息的请求和响应类型要尽量收窄

### 2. React

- 优先函数组件
- 组件按职责拆分，不按标签数量拆分
- 不要为了“看起来高级”而滥用抽象
- 只在确实必要时引入自定义 hook

### 3. 文案与交互

- 保持中文文案风格一致
- 状态提示尽量明确，不要含糊
- toast、错误信息、空状态文案要和当前产品语气一致

### 4. Chrome Extension

- 涉及 `chrome.runtime.sendMessage` 的改动要同时检查调用方和处理方
- 涉及存储结构的改动要考虑默认值和向后兼容
- 涉及 popup 初始化流程的改动要避免把重任务塞到首屏路径

## 验证方式

常用命令：

```bash
pnpm build
pnpm build:chrome
pnpm build:firefox
pnpm exec tsc --noEmit
```

当前已知情况：

- `pnpm build` 可作为主要构建验证
- `pnpm lint` 当前不能直接作为可靠验证，因为仓库缺少 ESLint 9 所需的 `eslint.config.*`
- `pnpm exec tsc --noEmit` 当前存在一个已知背景页定时器类型问题，需要结合报错位置判断是否与本次改动相关

如果某项验证失败，应明确说明：

- 失败的是哪条命令
- 是本次改动引入，还是仓库已有问题

## 文档习惯

当改动涉及以下内容时，建议同步补文档：

- 新的配置项
- 新的 runtime message 协议
- popup 结构性重构
- Apifox 相关缓存或性能策略变化

文档优先放在 `docs/`，名称尽量直接表达主题。

## 推荐阅读顺序

第一次接手本仓库时，建议按下面顺序看：

1. `README.md`
2. `src/lib/quick-copy.ts`
3. `src/pages/background/index.ts`
4. `src/pages/popup/Popup.tsx`
5. `docs/` 下已有设计说明

## 相关文档

- `docs/ai-context.md`
- `docs/ai-rules.md`
- `docs/code-style.md`
- `docs/popup-apifox-performance.md`
- `docs/popup-refactor-notes.md`

## 发布相关

使用 `/fe-chrome-ext-store-pre-publish` 调起发布流程 skill，按步骤完成 Chrome Web Store 和 Edge Add-ons 的发布。

提交表单时所用的完整内容见以下文档：

- `docs/chrome-web-store-listing.md` — Chrome Web Store 发布信息（中文）
- `docs/chrome-web-store-listing.en.md` — Chrome Web Store 发布信息（英文）
- `docs/edge-addons-listing.md` — Edge Add-ons 发布信息（中文）
- `docs/edge-addons-listing.en.md` — Edge Add-ons 发布信息（英文）
