# 响应异常规则

## 概述

扩展支持自定义响应体异常判断规则。对于 HTTP 状态码为 2xx 但业务逻辑异常的接口，可通过规则表达式自动标记异常。

## 配置格式

在设置面板中，异常响应规则配置为 JSON 数组格式：

```json
[
  {
    "label": "无权限",
    "expression": "res.rtn === 403"
  },
  {
    "label": "下拉为空",
    "expression": "res.data?.list?.length === 0 && res.data?.pagination == null"
  },
  {
    "label": "列表为空",
    "expression": "res.data?.list?.length === 0 && res.data?.pagination != null"
  },
  {
    "label": "接口异常",
    "expression": "res.rtn !== 0"
  }
]
```

## 判断语义

规则按数组顺序依次判断，**首条命中即停**：

1. 从第一条规则开始计算表达式
2. 若未命中，继续判断下一条
3. 若命中，立即返回该规则作为异常原因
4. 后续规则不再继续判断

一个接口**最多只会命中一条**异常规则。

## 表达式语法

| 运算符 | 说明 | 示例 |
|--------|------|------|
| `===` | 严格相等 | `res.rtn === 0` |
| `!==` | 严格不等 | `res.rtn !== 0` |
| `==` | 宽松相等 | `res.code == 200` |
| `!=` | 宽松不等 | `res.status != "ok"` |
| `>` | 大于 | `res.data.count > 0` |
| `<` | 小于 | `res.data.count < 100` |
| `>=` | 大于等于 | `res.data.count >= 10` |
| `<=` | 小于等于 | `res.data.count <= 100` |
| `&&` | 逻辑与 | `res.rtn !== 0 && res.msg != null` |
| `?.` | 可选链 | `res.data?.list?.length` |

## 响应快照

规则表达式基于响应体快照进行判断。快照经过以下裁剪：

- 最多保留 20 个 key
- 嵌套深度限制为 3 层
- 字符串截断至 300 字符
- 数组保留结构但不保留完整元素

## 默认配置

新用户默认配置为：

```json
[
  {
    "label": "接口异常",
    "expression": "res.rtn !== 0"
  }
]
```

## 配置校验

保存或导入配置时，扩展会对规则进行校验：

- 配置必须是 JSON 数组格式
- 每项必须包含非空的 `label` 和 `expression`
- `expression` 必须是可解析的表达式
- 非法配置会被拒绝保存并提示错误
