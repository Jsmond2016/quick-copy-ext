# 内容脚本复制 Markdown 链接

## 功能说明

内容脚本会在符合规则的页面内监听目标弹窗出现，并在弹窗右侧注入“复制 Markdown 链接”按钮。

当前已支持规则：

- 页面：`https://supermonkey.feishu.cn/wiki/*`
- 弹窗节点：同时包含以下 class
  - `J-card-edit-modal-body`
  - `bitable-hover-scrollbar-sm-no-shift`
  - `J-card-edit-modal-body--padding-standard`
- 目标字段：`data-field-id="fld0c084Bv"`
- 目标内容：字段内 `.formula_editor_value_wraper_text` 的文本内容

复制格式固定为：

```text
[【SaaS-立项申请】调减总金额不应取绝对值，展示实际值](https://supermonkey.feishu.cn/record/XFI6r74tWeO8auc677CceuIFnxt)
```

## 实现边界

当前实现主要改动了内容脚本相关文件：

- `index.ts`：站点规则、DOM 监听、按钮注入、复制逻辑、提示
- `public/contentStyle.css`：按钮与提示样式

没有接入 popup 设置页，也没有修改 background runtime message。

## 扩展方式

如需支持更多站点或字段，直接扩展 `src/pages/content/index.ts` 中的 `copyBugButtonRules` 即可。

单条规则至少需要：

- 页面 URL 匹配规则
- modal class 列表
- 目标字段 `markdownFieldId`

如果后续真的需要“用户可配置”，再把这组规则迁移到存储层和 popup 设置页，不建议在当前阶段提前扩大改动面。
