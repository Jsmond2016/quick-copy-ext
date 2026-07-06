# 代码规范

## 总体原则

- 简洁直接
- 类型明确
- 结构清楚
- 渐进式重构

不鼓励：

- 为抽象而抽象
- 过度封装
- 一眼看不懂的"聪明写法"

## TypeScript

### 推荐

- 优先显式类型，特别是共享结构、props、返回值
- 公共对象结构优先定义接口或类型
- 异步函数尽量标明返回值
- 对错误分支给出明确 fallback

### 不推荐

- 大量使用 `any`
- 把多个不同含义的结构混在一个宽泛对象里
- 用类型断言掩盖真实问题

## React 组件

### 拆分原则

组件拆分按职责和变化边界，而不是按 JSX 体积机械拆分。更推荐拆分的情况：

- 一块 UI 语义独立
- 这一块会单独演进
- props 边界清楚
- 主组件 JSX 过长影响阅读

不一定要拆的情况：

- 只使用一次且非常短
- 和父组件上下文强耦合
- 拆出去后 props 过多

### 状态管理

- 页面级状态留在页面组件
- 局部展示状态尽量贴近使用处
- 可复用副作用逻辑再抽 hook

## 文件组织

页面模块推荐结构：

```text
popup/
  Popup.tsx
  components/    # UI 组件
  hooks/         # 自定义 Hooks
  services/      # 通信层
  utils/         # 工具函数
  constants.ts   # 常量
  types.ts       # 类型
```

### 放置规则

- 共享业务逻辑：`src/lib/quick-copy/`
- 页面专属展示：页面目录下的 `components/`
- 页面专属工具：页面目录下的 `utils/`
- 页面专属通信：页面目录下的 `services/`

## 命名风格

- React 组件：`PascalCase.tsx`
- 工具、hooks、service、常量：`kebab-case.ts`
- 布尔值优先可读命名：`loading`、`copying`、`showSettings`
- 事件处理：`handleSaveSettings`、`handleRefreshApifox`

## Chrome Extension 约束

- Runtime Message 类型可枚举、响应结构清楚
- 存储配置有默认值、有兼容旧值的兜底
- 表单态和存储态分离
- popup 首屏路径保持轻量，避免重计算
