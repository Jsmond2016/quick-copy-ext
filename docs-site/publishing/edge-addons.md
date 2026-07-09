# Edge Add-ons 发布

## 基础信息

| 字段 | 内容 |
|------|------|
| **扩展名称** | Quick Copy Ext |
| **摘要** | 快速整理当前页面接口信息，并一键复制反馈内容。 |
| **类别** | Developer Tools |
| **界面语言** | 简体中文 |
| **定价** | 免费 |
| **年龄分级** | 3 岁以上 |

## 详细描述

与 Chrome Web Store 相同（见 [Chrome Web Store 发布](/publishing/chrome-web-store)）。

## 权限说明

与 Chrome Web Store 相同。

## 数据收集说明

扩展不会收集、上传或分享任何用户数据到远程服务器。

## Edge 与 Chrome 发布差异

| 项目 | Chrome Web Store | Edge Add-ons |
|------|-----------------|--------------|
| 开发者注册 | $5 一次性注册费 | 无需费用 |
| 审核时间 | 通常数小时到 1 天 | 通常 1-2 个工作日 |
| 构建产物 | 同一套构建（dist_chrome/） | 同一套构建（dist_chrome/） |
| 权限说明 | 需逐条提供理由 | 需逐条提供理由 |

## 打包命令

```bash
pnpm build:chrome
cd dist_chrome && zip -r ../quick-copy-ext-v1.x.x-edge.zip . && cd ..
```
