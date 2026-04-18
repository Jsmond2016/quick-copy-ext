# Popup 组件重构思路记录

## 背景

`src/pages/popup/Popup.tsx` 在重构前承担了过多职责：

- 页面级状态管理
- Chrome runtime / tabs 通信
- 设置表单输入处理
- Apifox 刷新与错误处理
- toast 生命周期管理
- 页面摘要、请求列表、备注区、设置区等多块 UI 渲染

这些逻辑全部堆在一个文件里，会带来几个直接问题：

- 文件过长，阅读成本高
- 修改某一块功能时，容易影响其他逻辑
- UI 和业务逻辑耦合，复用困难
- 后续新增功能时，`Popup.tsx` 会继续膨胀

## 重构目标

这次重构不是为了“拆文件而拆文件”，而是为了让 popup 页面按职责分层，做到：

- 主组件只保留页面级编排逻辑
- 通信逻辑独立，避免散落在 UI 中
- 表单转换逻辑集中，避免重复处理
- 视觉区块拆成独立组件，降低单文件复杂度
- 公共常量、类型、轻量 hooks 单独归档

## 重构原则

本次拆分遵循下面几个原则。

### 1. 先按职责边界拆，不先追求“最少代码”

有些逻辑虽然代码量不大，但职责很明确，比如：

- runtime 消息发送
- toast 自动消失
- settings 表单和 settings 存储结构之间的转换

这类逻辑即使不长，也适合单独抽出。因为真正影响维护成本的，不只是代码行数，更是职责是否清晰。

### 2. 主组件保留“编排”，子模块负责“实现细节”

`Popup.tsx` 仍然保留这些页面级逻辑：

- 页面初始化加载
- 请求选择状态管理
- 保存设置、刷新 Apifox、复制反馈等主流程
- 组件之间的数据流组织

但具体实现细节被移出，例如：

- 如何向 background 发消息
- 如何把设置对象转成 textarea 文本
- 每个 panel 的具体 JSX 结构

这样主组件更像“控制器”，而不是“巨型杂糅文件”。

### 3. 先做稳定拆分，再考虑进一步抽 hook

这次优先拆的是比较稳定的边界：

- `components`
- `services`
- `utils`
- `constants`
- `hooks`

没有一步到位把所有 handler 都抽成大 hook，是因为当前页面仍然有较强的页面上下文。先完成稳定拆分，再决定是否抽 `usePopupController`，风险更低。

## 目录拆分方案

重构后 popup 目录新增了下面这些模块：

```text
src/pages/popup/
  Popup.tsx
  components/
    NotePanel.tsx
    PageSummaryPanel.tsx
    PopupHero.tsx
    RequestHistoryPanel.tsx
    SettingsPanel.tsx
    ToastMessage.tsx
  constants.ts
  hooks/
    useToast.ts
  services/
    runtime.ts
  types.ts
  utils/
    settings-form.ts
```

## 各模块职责

### 1. `Popup.tsx`

主组件负责页面编排：

- 初始化加载设置和页面请求数据
- 管理页面核心状态
- 处理复制、保存设置、刷新 Apifox 等主流程
- 把状态和事件传递给各子组件

重构后的目标不是让它“没有逻辑”，而是让它只保留页面层逻辑。

### 2. `services/runtime.ts`

这个文件专门承接 popup 与扩展后台之间的通信，包括：

- 获取当前标签页
- 获取请求记录
- 清空请求记录
- 获取 Apifox 状态
- 刷新 Apifox 数据
- 获取 Apifox 匹配结果

这样做的好处是：

- `chrome.runtime.sendMessage` 不再散落在页面里
- 错误处理方式更集中
- 后续如果消息类型调整，只需优先改这里

### 3. `utils/settings-form.ts`

设置面板里有一个典型问题：

- 存储结构是 `QuickCopySettings`
- 表单结构是多个字符串输入框和 textarea

这两者并不完全相同，所以需要一个转换层。

这个文件负责：

- 从 `QuickCopySettings` 生成表单初始值
- 从表单输入反向生成可保存的 settings

这样可以避免在 `Popup.tsx` 中反复出现：

- `stringifyLines`
- `parseLines`
- 默认值兜底

### 4. `hooks/useToast.ts`

toast 的自动消失逻辑是一个典型的轻量状态副作用，适合抽成独立 hook：

- 页面只负责 `setToast`
- hook 内负责定时清理

这样可以减少主组件里和业务无关的副作用代码。

### 5. `constants.ts` 和 `types.ts`

这两个文件主要承接 popup 内部的小型基础定义：

- 默认页面信息
- 默认 Apifox 状态
- toast 类型

虽然内容不多，但放在单独文件里后，`Popup.tsx` 的初始化代码会更清楚。

### 6. `components/*`

UI 拆分按视觉区块和交互边界进行，而不是按标签数量拆。

#### `PopupHero.tsx`

负责顶部品牌区、Apifox 状态和设置入口。

#### `SettingsPanel.tsx`

负责设置表单区域，只处理表单展示和字段回调。

#### `PageSummaryPanel.tsx`

负责当前页面标题、URL、监听页面状态展示。

#### `RequestHistoryPanel.tsx`

负责请求记录列表、筛选结果、选择操作和状态文案展示。

#### `NotePanel.tsx`

负责备注输入和复制按钮。

#### `ToastMessage.tsx`

负责 toast 的展示，不负责生命周期。

## 为什么这样拆

这次拆分背后的判断标准主要有三个。

### 1. 看是否有独立变化原因

例如设置面板和请求列表会独立变化：

- 设置项可能扩展
- 请求卡片可能增加更多字段

它们本来就不是一类变化，因此适合分开。

### 2. 看是否有重复的转换逻辑

表单和 settings 之间的转换是一个独立问题，抽到 `utils` 后可以减少页面中间态的复杂度。

### 3. 看是否属于基础设施层

像 runtime 消息通信、toast 生命周期、默认常量，本质上都不是业务 UI，适合下沉。

## 这次重构后的收益

### 1. 降低阅读成本

现在看 popup 页面时，可以按层次进入：

1. 先看 `Popup.tsx` 理解整体流程
2. 再按需进入 `services`、`utils`、`components`

不需要一上来就在一个大文件里同时理解全部内容。

### 2. 降低修改风险

例如以后只想改设置面板样式或交互，主要关注：

- `components/SettingsPanel.tsx`
- `utils/settings-form.ts`

不容易误碰请求复制、Apifox 刷新等逻辑。

### 3. 让后续继续演进更自然

当前结构已经为后续继续拆分留好了位置，比如：

- 把页面级 handler 继续抽成 `usePopupController`
- 给请求列表增加更细粒度的 request item 组件
- 给设置区增加 schema 化配置定义

## 当前仍然保留在 `Popup.tsx` 的内容

虽然已经完成一轮拆分，但 `Popup.tsx` 里仍然保留了不少页面级逻辑，例如：

- `loadData`
- `runApifoxRefresh`
- `copyFeedback`
- `handleSaveSettings`
- `handleRefreshApifox`

这是当前刻意保留的结果。

原因是这些逻辑虽然较长，但彼此仍然围绕 popup 页面本身协同工作。如果现在强行继续拆，可能会把上下文切得过碎，反而增加理解成本。

## 后续可继续优化的方向

如果后面还想进一步瘦身，可以按下面顺序继续推进。

### 1. 抽 `usePopupController`

把页面级状态和主要 handler 统一放进一个 hook，例如：

- 初始化加载
- 请求选择逻辑
- 保存设置
- 复制反馈
- Apifox 刷新

这样 `Popup.tsx` 最终可以只负责组件拼装。

### 2. 抽请求列表项组件

如果请求卡片后续会展示更多信息，比如：

- 状态码
- traceId
- 请求时间
- Apifox 命中状态

可以把单条记录再拆成 `RequestCard`。

### 3. 让设置项进一步配置化

如果设置表单字段持续增长，可以考虑把字段定义抽成 schema，例如：

- 字段名
- 标签
- 占位符
- 帮助文案
- 控件类型

这样设置面板就可以从“手写 JSX”逐步过渡到“基于配置渲染”。

## 结论

这次重构的核心不是简单把一个大文件拆成多个小文件，而是明确 popup 页面里的职责边界：

- 页面编排留在主组件
- 通信下沉到 service
- 表单转换下沉到 utils
- 轻量副作用抽成 hook
- 视觉区块拆成独立组件

这样做的结果是：

- 结构更清楚
- 维护成本更低
- 后续扩展路径更自然

如果以后继续重构 popup，建议仍然沿着这个方向推进，而不是重新回到“所有逻辑集中在主组件”。
