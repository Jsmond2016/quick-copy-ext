# 监听域名

## 概述

`monitoredOrigins` 配置项用于指定扩展需要监听网络请求的域名。只有匹配配置的域名下的请求才会被捕获和记录。

## 默认值

```
["localhost", "127.0.0.1"]
```

## 配置规则

- 每个条目为一个域名或 IP
- 支持通配符格式，如 `*.example.com`
- 支持完整的 URL，如 `https://api.example.com`

### 示例

```json
[
  "localhost",
  "127.0.0.1",
  "*.example.com",
  "dev-api.company.com",
  "192.168.1.100"
]
```

## 工作原理

- 扩展通过 `chrome.webRequest` 监听页面请求
- 在 `onBeforeRequest` 阶段检查请求 URL 是否匹配 `monitoredOrigins` 中的任意条目
- 仅匹配的请求会被创建为请求记录
- 不匹配的请求被忽略，不占用内存

## 注意事项

- 修改后需要**刷新页面**才能完全生效
- 扩展使用 `<all_urls>` 主机权限以支持用户添加任意域名
- 扩展只在配置的域名范围内记录请求，不会无差别收集
