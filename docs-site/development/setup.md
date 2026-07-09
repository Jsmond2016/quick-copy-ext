# 环境搭建

## 前置条件

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 10

## 安装 pnpm

```bash
# 如未安装 pnpm，使用 npm 全局安装
npm install -g pnpm
```

## 克隆并安装依赖

```bash
git clone https://github.com/Jsmond2016/quick-copy-ext.git
cd quick-copy-ext
pnpm install
```

## 开发构建

监听文件变化，自动重新构建：

```bash
pnpm dev
```

或指定浏览器：

```bash
pnpm dev:chrome
pnpm dev:firefox
```

## 加载到浏览器

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions`
3. 打开右上角"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目中的 `dist_chrome/` 目录

## 文档开发

```bash
# 启动 VitePress 文档开发服务器
pnpm docs:dev

# 构建文档站点
pnpm docs:build
```
