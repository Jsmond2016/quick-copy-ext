# 快速开始

## 安装方式

### 方式一：从应用商店安装

- [Edge 插件市场](https://microsoftedge.microsoft.com/addons/detail/quick-copy-ext/fnmgpnhfffhkfdfpmnncngaoffpapcfn)
- [Chrome 插件市场](https://chromewebstore.google.com/detail/quick-copy-ext/okaggkbgnihmpaonaonhlcjcedbfbjcg)

> 注意：插件市场审核较慢，安装的可能不是最新版本。如需要最新版本，建议使用开发者模式加载。

### 方式二：开发者模式加载本地构建

1. 确保已安装 [Node.js](https://nodejs.org/) 和 pnpm：

   ```bash
   # 安装 pnpm（如已安装可跳过）
   npm install -g pnpm
   ```

2. 克隆仓库并安装依赖：

   ```bash
   git clone https://github.com/Jsmond2016/quick-copy-ext.git
   cd quick-copy-ext
   pnpm install
   ```

3. 构建扩展：

   ```bash
   pnpm build
   ```

   构建产物输出到 `dist_chrome/` 目录。

4. 加载扩展：

   - 打开 Chrome 浏览器
   - 访问 `chrome://extensions`
   - 打开右上角"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目中的 `dist_chrome/` 目录

## 开发构建

如需在开发时监听文件变化，自动重新构建：

```bash
pnpm dev
```

## 验证安装

安装成功后，在任意网页中，点击浏览器工具栏中的扩展图标 ![icon](/icon-32.png)，即可打开 Quick Copy Ext 弹出面板。

如果页面中的接口请求被正常捕获，你将在面板中看到请求记录列表。
