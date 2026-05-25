---
name: fe-chrome-ext-store-pre-publish
description: 发布前端 Chrome 扩展到 Chrome Web Store 和 Edge Add-ons 的预发布流程
---

# Publish Store — Quick Copy Ext 发布技能

将 Quick Copy Ext 发布到 Chrome Web Store 和 Microsoft Edge Add-ons 的完整流程。包含构建、截图、表单填写、提交审核等步骤。

---

## 工作流程

### Step 1: 确认版本与构建

1. 确认当前版本号（`package.json` 中的 `version` 字段）
2. 构建 Chrome 版本：
   ```bash
   pnpm build:chrome
   ```
3. 打包 ZIP：
   ```bash
   cd dist_chrome && zip -r ../quick-copy-ext-v<版本号>.zip . && cd ..
   ```

### Step 2: 准备表单填写内容

根据发布目标，从以下文档中复制对应内容：

- **Chrome Web Store（中文）** → `docs/chrome-web-store-listing.md`
- **Chrome Web Store（English）** → `docs/chrome-web-store-listing.en.md`
- **Edge Add-ons（中文）** → `docs/edge-addons-listing.md`
- **Edge Add-ons（English）** → `docs/edge-addons-listing.en.md`

每个文档包含完整的表单字段内容，可直接复制粘贴。

### Step 3: 准备截图

需要准备 3-5 张 1280x800 的截图：

1. **弹出面板主界面** — 展示接口请求列表（含 URL、方法、状态码、traceId 等字段，勾选若干接口）
2. **设置页面** — 展示监听域名、接口前缀过滤、Apifox 导出地址等配置
3. **复制效果** — 示复制后的结构化反馈文本（页面信息 + 接口详情 + 自定义字段）
4. **Apifox 关联（可选）** — 展示接口已匹配到 Apifox 接口名称的效果
5. **异常检测（可选）** — 展示接口标记异常（HTTP 状态码异常 / 业务规则命中）的效果

截图要求：
- 格式：PNG 或 JPEG
- 最小 640x400，推荐 1280x800
- 无边框、无圆角
- 界面为简体中文

### Step 4: Chrome Web Store 发布

1. 访问 https://chrome.google.com/webstore/devconsole
2. 使用 Google 账号登录（需要支付 $5 一次性注册费）
3. 点击 "New item" 上传 ZIP 包
4. 依次填写：

#### 4.1 基础信息
- 从 `docs/chrome-web-store-listing.md` 复制 **扩展名称 / Short Description / Detailed Description**
- 类别选择 **Developer Tools**
- 语言选择 **简体中文 (zh-CN)**

#### 4.2 隐私与权限
- 从文档复制 **Permission Justifications** 逐条填写
  - `activeTab` — 获取当前标签页 URL 和标题
  - `tabs` — 监听标签页变化、关闭时清理
  - `webRequest` — 捕获 XHR 请求调试信息
  - `storage` — 持久化配置与会话缓存
  - `<all_urls>` — 在用户配置的任意域名上捕获请求
- 从文档复制 **Data Usage** 隐私说明

#### 4.3 图片
- 上传 `public/icon-128.png` 作为图标
- 上传截图（1280x800）

#### 4.4 提交审核
- 检查所有字段
- 选择发布范围为 "Public"
- 提交审核

### Step 5: Edge Add-ons 发布

1. 访问 https://partner.microsoft.com/
2. 使用 Microsoft 账号登录（无需注册费）
3. 进入 "Edge Add-ons" 模块
4. 点击 "Create new" 上传 ZIP 包

#### 5.1 基础信息
- 从 `docs/edge-addons-listing.md` 复制对应内容
- 类别选择 **Developer Tools**
- 填写搜索关键词

#### 5.2 隐私与权限
- 与 Chrome Web Store 内容一致，从文档复制

#### 5.3 图片
- 上传 `public/icon-128.png` 作为图标
- 上传截图

#### 5.4 提交审核
- 检查所有字段
- 可见性选择 "Public"
- 年龄分级选择 "3+"
- 提交审核

### Step 6: 审核后操作

1. **审核通过** → 扩展会自动上架
2. **审核拒绝** → 根据拒绝原因修改后重新提交
   - 常见原因：权限说明不够详细 → 补充更多代码层面的理由
   - 截图不符合要求 → 调整尺寸或内容
3. **版本更新** → 修改 `package.json` 版本号后重新构建打包，在商店控制台上传新包

---

## 常见问题

### 权限被退回
如果商店审核团队认为权限理由不充分，可以强调：
- `webRequest` 仅读取请求头中的 traceId，不读取请求体
- `tabs` 仅在 background Service Worker 中使用，用户无感知
- `<all_urls>` 的行为受限于用户配置的监听范围，默认仅 localhost

### 截图内容过时
如果 UI 有更新，需要重新截图。建议在每次大版本发布前更新截图。

### Edge 与 Chrome 使用同一构建产物
Edge Add-ons 兼容 Chrome MV3 扩展。直接使用 `dist_chrome/` 的构建产物上传即可，无需额外适配。
