---
layout: home

hero:
  name: Quick Copy Ext
  text: 一键捕获 · 标准化反馈
  tagline: 一个面向 Web 开发者和测试人员的浏览器扩展，自动捕获页面接口信息，一键复制标准化异常反馈内容，减少前后端沟通成本。
  image:
    src: /icon-128.png
    alt: Quick Copy Ext
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 功能特性
      link: /features/
    - theme: alt
      text: GitHub
      link: https://github.com/Jsmond2016/quick-copy-ext

features:
  - title: 自动捕获接口请求
    details: 监听当前页面的 XHR / fetch 请求，自动收集 URL、方法、状态码、traceId、耗时等信息。
  - title: 一键复制标准化反馈
    details: 将页面信息、勾选的接口记录、备注等整理为结构化文本，一键写入剪贴板。
  - title: 响应规则异常检测
    details: 支持自定义响应体判断表达式（如 res.rtn !== 0），自动标记业务逻辑异常接口。
  - title: Apifox 接口关联
    details: 对接 Apifox 导出服务，自动关联接口文档地址和名称，跳转查看详情。
  - title: 灵活的多选复制
    details: 支持 Shift 连续多选，可控制是否包含请求入参、环境信息等。
  - title: 配置导入/导出
    details: 监听规则、过滤规则等配置支持 JSON 导入导出，方便团队共享。
---
