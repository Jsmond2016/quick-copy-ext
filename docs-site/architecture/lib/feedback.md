# 反馈文本生成

## 概述

`src/lib/quick-copy/feedback.ts` 提供反馈文本的组装生成能力，将页面信息、接口详情、备注和自定义字段拼接为标准化格式。

## 核心函数

### buildFeedbackText()

组装完整的反馈文本：

```typescript
function buildFeedbackText(payload: CopyPayload): string
```

**参数 `CopyPayload`**：

```typescript
interface CopyPayload {
  page: PageSummary;                   // 页面信息（URL + 标题）
  requests: NetworkRequestRecord[];    // 选中的请求记录
  feedbackTitle: string;              // 反馈标题
  note: string;                        // 备注内容
  screenshotLabel: string;            // 截图标识
  customFields: string[];            // 自定义字段
  includeRequestParams: boolean;      // 是否包含接口入参
  selectedEnvironment?: {             // 环境信息（可选）
    name: string;
    url: string;
  };
}
```

### buildWebOnlyText()

仅组装页面信息和环境信息，不含接口请求：

```typescript
function buildWebOnlyText(payload: CopyPayload): string
```

## 文本格式

详见[反馈文本格式](/features/feedback-format)页面。

## 关键逻辑

- 标题补充：版本信息末尾追加发布日期
- 接口排序：按请求时间排序
- 空值处理：traceId 等不存在时显示 `-`
- 异常信息：仅异常接口显示异常原因
- Apifox 链接：匹配到 Apifox 时显示链接
- 可选内容：接口入参和环境信息可通过选项控制
