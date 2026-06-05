# Quick Copy Ext

一个用于 Web 异常问题反馈的 Chrome 扩展。

它可以采集当前页面的基础信息与接口请求记录，支持按接口前缀过滤、勾选目标请求，并一键复制标准化的异常反馈内容，减少前后端之间反复补充信息的沟通成本。

## 安装使用
> 说明：插件市场审核慢，安装的可能不是最新版本

- Edge 插件市场：[Quick Copy Ext](https://microsoftedge.microsoft.com/addons/detail/quick-copy-ext/fnmgpnhfffhkfdfpmnncngaoffpapcfn)
- Chrome 插件市场：[Quick Copy Ext](https://chromewebstore.google.com/detail/quick-copy-ext/okaggkbgnihmpaonaonhlcjcedbfbjcg?hl=zh-CN&utm_source=ext_sidebar)
## 功能特性

- 自动读取当前页面 URL 与标题
- 捕获当前页面接口请求记录
- 支持按接口前缀过滤请求
- 支持勾选一个或多个异常接口
- 支持提取 `traceId`、状态码、请求时间、耗时、接口大小等信息
- 支持自定义附加字段，例如“反馈人-张三”
- 支持一键复制标准化反馈文本
- 支持复制成功提示与设置保存提醒

## 技术栈

- React
- TypeScript
- Vite
- Chrome Extension Manifest V3
- pnpm

## 本地开发

### 安装依赖

```bash
pnpm install
```

### 启动开发构建

```bash
pnpm dev
```

默认会构建 Chrome 版本并监听文件变化。

### 生产构建

```bash
pnpm build
```

构建产物输出到 `dist_chrome/` 目录。

## 版本与发布

当前项目已经补充了基础的版本管理、changelog 与自动发布配置。

### 常用命令

```bash
pnpm run changelog
pnpm run version:patch
pnpm run version:minor
pnpm run version:major
```

### 自动发布约定

当推送到 `main` 分支的最新提交信息符合以下格式时：

```bash
chore(release): x.y.z
```

GitHub Actions 会自动执行以下流程：

- 安装依赖
- 构建 Chrome / Firefox 扩展
- 生成 ZIP 包
- 创建 Git tag
- 创建 GitHub Release

### 相关文件

- `CHANGELOG.md`
- `scripts/bump-version.sh`
- `scripts/generate-changelog.sh`
- `scripts/release.sh`
- `.github/workflows/ci.yml`
- `.github/workflows/auto-release.yml`

## 加载插件

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions`
3. 打开右上角“开发者模式”
4. 点击“加载已解压的扩展程序”
5. 选择项目中的 `dist_chrome/` 目录

## 项目结构

```text
src/
  lib/              共享类型、格式化与配置逻辑
  pages/
    background/     请求记录采集
    content/        内容脚本入口
    popup/          插件弹窗 UI
```

## 配置说明

插件支持在 popup 右上角进入设置视图，当前支持以下配置项：

- 接口前缀过滤
- 自定义字段

保存配置后，需要刷新当前页面，新的过滤规则才会生效。

## 复制内容说明

复制后的反馈内容包含以下信息：

- 页面 URL
- 页面标题
- 接口方法与路径
- `traceId`
- 状态码
- 请求时间
- 耗时
- 接口大小
- 自定义字段
- 备注内容

## 致谢

本项目基于开源项目模板 [JohnBra/vite-web-extension](https://github.com/JohnBra/vite-web-extension) 进行开发，并在其基础上完成了与当前业务场景相关的定制化改造。
