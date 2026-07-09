# Apifox 接口关联

## 概述

Quick Copy Ext 支持对接 Apifox（接口文档管理工具），自动将捕获的接口请求与 Apifox 文档中的接口进行匹配。匹配成功后，复制反馈内容时会附带 Apifox 接口链接和名称，方便协作方直接跳转查看接口详情。

## 配置方式

在设置面板的 **Apifox 接口配置** 区域进行配置：

### 方式一：Apifox Online API（推荐）

需要填写以下两个字段：

- **Apifox 项目 ID**：Apifox 项目的唯一标识
  - 可以从 Apifox 项目的 URL 中获取：`https://app.apifox.com/project/{projectId}`
- **Apifox Auth Token**：在 Apifox 中生成的 Personal Access Token
  - 进入 Apifox → 左下角头像 → 账号设置 → 个人访问令牌 → 创建新令牌

扩展通过 `api.apifox.com/v1/projects/{projectId}/export-openapi` 接口获取 OpenAPI 数据。

### 方式二：本地导出服务

- **Apifox 导出 URL**：`http://127.0.0.1:4523/export/openapi?projectId={PROJECT_ID}`

要求本地 Apifox 桌面端已打开。

## 匹配逻辑

1. 扩展从 Apifox 导出 OpenAPI Schema，解析所有接口定义
2. 构建三个查找索引：
   - **endpointMap**：`方法+路径` → Apifox 链接
   - **pathMap**：`路径` → Apifox 链接（忽略方法的兜底匹配）
   - **endpointNameMap**：`方法+路径` → 接口名称
3. 捕获请求后，优先尝试精确匹配（方法+路径），未命中时回退到路径匹配

## 状态指示

popup 顶部的 Apifox 状态灯：

| 状态 | 说明 |
|------|------|
| 🟢 绿色 + 条数 | Apifox 数据已就绪，显示已缓存的接口数量 |
| ⚪ 灰色 | Apifox 数据未就绪或未配置 |
| 🔄 刷新中 | 正在后台拉取最新数据 |

## 刷新机制

- 保存 Apifox 配置后，会在**后台异步**刷新数据，不阻塞用户操作
- 可点击刷新按钮手动触发刷新
- popup 打开时只读取缓存状态，不主动触发刷新

## 性能设计

Apifox 的 OpenAPI 数据可能包含大量接口（如 2000+），扩展做了以下优化：

1. **只保留最小索引**：不保留完整 schema，只保留 `endpointMap` 和 `pathMap`
2. **popup 首屏不解析**：popup 打开时只读取后台缓存状态
3. **解析时直接建索引**：遍历 schema 时直接写入 Map，避免中间数组
4. **后台异步刷新**：刷新操作在后台 Service Worker 中执行
