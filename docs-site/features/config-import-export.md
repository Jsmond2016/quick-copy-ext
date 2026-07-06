# 配置导入/导出

## 概述

扩展支持通过 JSON 格式导入和导出完整的配置，方便团队共享配置规则或在不同浏览器之间迁移设置。

## 导出配置

1. 在 popup 中进入设置面板
2. 点击"导出配置"
3. 配置将以 JSON 格式展示在弹窗中
4. 复制或下载为 JSON 文件保存

## 导入配置

1. 在 popup 中进入设置面板
2. 点击"导入配置"
3. 在弹出的编辑框中粘贴 JSON 配置内容
4. 确认后配置即被应用

## 配置内容

导出的配置包含以下所有设置项：

| 配置项 | 说明 |
|--------|------|
| feedbackTitle | 反馈标题 |
| monitoredOrigins | 监听域名列表 |
| apiPrefixes | 接口前缀过滤 |
| customFields | 自定义字段 |
| quickFillTemplates | 快速填入模板 |
| apifoxExportUrl | Apifox 导出地址/项目ID |
| apifoxAuthToken | Apifox 认证令牌 |
| responseErrorRule | 异常响应规则 |
| mode | 模式（default/developer/tester） |
| quickMockTargetExtensionId | Quick Mock 目标扩展 ID |
| testerAioConfigs | 测试者 AIO 配置 |
| environments | 环境配置 |

## 适用场景

- **团队共享**：团队统一配置监听域名和过滤规则，导出后分发给成员导入
- **设备迁移**：在新设备或浏览器上快速恢复配置
- **配置备份**：在调整配置前导出备份，便于回退
- **环境同步**：开发和测试环境使用同一套 Apifox 和 Mock 配置
