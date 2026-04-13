# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.4.7](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.6...v1.4.7) (2026-04-13)


### Bug Fixes

* normalize apifox preview url ([b37faf2](https://github.com/Jsmond2016/quick-copy-ext/commit/b37faf270522c4f5d6a737b7a31b6bd7e64f2b06))


### Features

* restrict request capture by origin ([e9d59ad](https://github.com/Jsmond2016/quick-copy-ext/commit/e9d59adcbff8c9725df56607daad43172192a743))

## [1.4.6](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.5...v1.4.6) (2026-04-13)


### Bug Fixes

* **ci:** correct workflow condition syntax ([3037f94](https://github.com/Jsmond2016/quick-copy-ext/commit/3037f9476eb235f0ddb9a3a01dbd62d21ba12283))
* **copy:** trim request urls in feedback ([3b82f67](https://github.com/Jsmond2016/quick-copy-ext/commit/3b82f67592bd64f5adaf452135398dc74b468e5a))


### Features

* support apifox mapping config ([a8d6934](https://github.com/Jsmond2016/quick-copy-ext/commit/a8d6934016ebe4b96a44b291c3a6e406f1258768))

## [1.4.5](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.4...v1.4.5) (2026-04-13)


### Features

* optimize popup request summary layout ([cccc8df](https://github.com/Jsmond2016/quick-copy-ext/commit/cccc8dff59107d0d925d849f8faa1a55d0928109))
* 当字段没有值，不写入复制内容 ([5998c93](https://github.com/Jsmond2016/quick-copy-ext/commit/5998c93f9359b00c9a46fcdc819e89029608446a))

## [1.4.4](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.0...v1.4.4) (2026-04-12)


### Bug Fixes

* normalize changelog release script ([f98ca2f](https://github.com/Jsmond2016/quick-copy-ext/commit/f98ca2f26f6607e9f07aa33537cf822176e2d79f))

## [1.4.3](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.0...v1.4.3) (2026-04-12)


### Bug Fixes

* normalize changelog release script ([f98ca2f](https://github.com/Jsmond2016/quick-copy-ext/commit/f98ca2f26f6607e9f07aa33537cf822176e2d79f))
## [Unreleased]

## [1.4.2](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.0...v1.4.2) (2026-04-12)

### Documentation

- 初始化首个 release 基线 changelog

### Build

- 补充 changelog、版本脚本与自动发布工作流

## [1.4.0] - 2026-04-12

### Features

- 初始化 Quick Copy Ext 项目基础能力
- 支持采集当前页面 URL、标题与接口请求记录
- 支持按接口前缀过滤异常接口
- 支持勾选接口并复制标准化反馈内容
- 支持展示 `traceId`、状态码、请求时间、耗时、接口大小
- 支持自定义字段配置与 popup 设置视图
- 支持复制成功提示与设置保存提醒

### Documentation

- 完善 README、需求文档与项目元信息

### Build

- 补充 changelog、版本脚本与自动发布工作流
