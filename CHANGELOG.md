# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.4.42](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.40...v1.4.42) (2026-07-02)


### Bug Fixes

* **api:** 修复 Apifox 接口链接含 /web/ 路径导致跳转错误 ([95e95a5](https://github.com/Jsmond2016/quick-copy-ext/commit/95e95a57282f12e8582fc17bc213909098529540))

## [1.4.41](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.40...v1.4.41) (2026-07-01)


### Bug Fixes

* **api:** 修复 Apifox 接口链接含 /web/ 路径导致跳转错误 ([95e95a5](https://github.com/Jsmond2016/quick-copy-ext/commit/95e95a57282f12e8582fc17bc213909098529540))

## [1.4.40](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.39...v1.4.40) (2026-07-01)


### Features

* **apifox:** 在线 API 替代本地接口，支持配置授权令牌 ([2b4bf61](https://github.com/Jsmond2016/quick-copy-ext/commit/2b4bf61d1a7ff08b7efd2bd3e5b1dff9b1002722))

## [1.4.39](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.38...v1.4.39) (2026-07-01)


### Bug Fixes

* **popup:** 环境字段改为根据当前页面 URL 动态匹配，不再固定取第一个环境 ([bded24f](https://github.com/Jsmond2016/quick-copy-ext/commit/bded24fdf1e14e7a87c50417536d65c065ff84e9))


### Features

* **popup:** 新增接口面板悬浮滚动导航按钮 ([a48679d](https://github.com/Jsmond2016/quick-copy-ext/commit/a48679d08971fb9fe1ca47695cb5d7d0a9d7ff8e))
* **popup:** 顶部环境 badge 展示当前域名以外的其他环境 ([ee2e3df](https://github.com/Jsmond2016/quick-copy-ext/commit/ee2e3dfe32c048738c0891cbae8a49eb3184ccd3))
* 新增环境配置功能，支持自定义环境类型与切换 ([42f11b1](https://github.com/Jsmond2016/quick-copy-ext/commit/42f11b1d64a3df7d3c9d37f8a6f6e6e8364f3787))

## [1.4.38](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.37...v1.4.38) (2026-06-15)


### Features

* **popup:** 新增已选接口列并优化复制按钮 ([d153e7f](https://github.com/Jsmond2016/quick-copy-ext/commit/d153e7f238e011b4d779c6af7a74b337ad5a82c0))
* **popup:** 无选中接口时支持复制 Web 信息 ([78fc184](https://github.com/Jsmond2016/quick-copy-ext/commit/78fc1847f22ffacd5c05f57a1f53a386b3566c2e))
* **utils:** 复制接口信息增加 URL-pathname 字段，统一空值占位符为 - ([d4b5068](https://github.com/Jsmond2016/quick-copy-ext/commit/d4b5068de39260755bf98028be05a65d913f2509))

## [1.4.37](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.36...v1.4.37) (2026-06-04)


### Features

* 文案调整，不显示总接口数量；默认选中接口入参 ([996d3bc](https://github.com/Jsmond2016/quick-copy-ext/commit/996d3bc31ddf6f10490bbe0d062c7da641622834))

## [1.4.36](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.35...v1.4.36) (2026-06-01)


### Features

* **pages:** 新增测试者模式与 AIO 复制配置 ([caaa185](https://github.com/Jsmond2016/quick-copy-ext/commit/caaa18528e58c827cac0fb3ac01f35ea6ee31bdd))
* **pages:** 简化 Apifox 配置与导入导出 ([d498f99](https://github.com/Jsmond2016/quick-copy-ext/commit/d498f9976ae31ff17113c4129c7b22a4328450c2))
* **pages:** 调整复制选项面板布局 ([2373069](https://github.com/Jsmond2016/quick-copy-ext/commit/2373069af6be6379bd99d0b4b0a8acbe110a797a))

## [1.4.35](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.34...v1.4.35) (2026-06-01)


### Bug Fixes

* **components:** 缩小开发者模式开关点击范围 ([c462c9a](https://github.com/Jsmond2016/quick-copy-ext/commit/c462c9a790e17ff23a15390f7e55d07d8f36eb5c))
* **pages:** 修复配置导入遗漏开发者模式 ([7e9e4c3](https://github.com/Jsmond2016/quick-copy-ext/commit/7e9e4c36a77ff21e91de550ffca5dac6622c9e2e))
* 修复后台响应采集匹配并补充评审文档 ([e397f6f](https://github.com/Jsmond2016/quick-copy-ext/commit/e397f6f8d496a16d9fc6878e4ca3c71c6563f615))


### Features

* **pages:** 添加开发者模式与快速 mock ([414a39c](https://github.com/Jsmond2016/quick-copy-ext/commit/414a39c9f4d3eefbaecccca91005e877c1c8adb6))

## [1.4.34](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.33...v1.4.34) (2026-05-28)


### Bug Fixes

* **utils:** 修复异常原因复制摘要内容 ([eb780bf](https://github.com/Jsmond2016/quick-copy-ext/commit/eb780bf7d0a70e5af3c99572186056735548a006))


### Features

* **pages:** Apifox 标签支持动态跳转项目链接 ([2dc8daf](https://github.com/Jsmond2016/quick-copy-ext/commit/2dc8dafc0a0bd3f2540c653b04430e55f917ee31))
* **utils:** 支持自定义异常响应规则配置 ([6c8fe46](https://github.com/Jsmond2016/quick-copy-ext/commit/6c8fe468417b34300295ef73572d94bfe874c833))

## [1.4.33](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.32...v1.4.33) (2026-05-25)


### Features

* 补充预发布插件skill ([56a4aee](https://github.com/Jsmond2016/quick-copy-ext/commit/56a4aee6881580e2731c41b6ca07adf95e62a1c0))

## [1.4.32](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.31...v1.4.32) (2026-05-21)


### Features

* 从 sidepanel 方案改回 popup 方案 ([52f1949](https://github.com/Jsmond2016/quick-copy-ext/commit/52f19494f68e686a00cfe367a86795d41cc4f461))
* 按住 shift 可连续勾选多个接口 ([e0321d0](https://github.com/Jsmond2016/quick-copy-ext/commit/e0321d0d44178185a7e42d7a27bf5aeb74ba3a55))
* 补充中文的接口名字 ([702c603](https://github.com/Jsmond2016/quick-copy-ext/commit/702c603e7eb868ab1bd95f81e444d29df06b1624))

## [1.4.31](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.30...v1.4.31) (2026-05-18)


### Features

* use side panel for chrome entry ([9ead3db](https://github.com/Jsmond2016/quick-copy-ext/commit/9ead3dbda272d6c3c4b34f52acae6e9a696d2de7))
* 实时同步接口变化到 sidepanel 接口列表中 ([2f1698e](https://github.com/Jsmond2016/quick-copy-ext/commit/2f1698e1fcca0203e5d39acae6e1032fa11b2572))

## [1.4.30](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.26...v1.4.30) (2026-05-15)


### Bug Fixes

* include request params in copied feedback ([7b2e066](https://github.com/Jsmond2016/quick-copy-ext/commit/7b2e0668df01eafe9eb79dcdff1df2d0a0f74e3d))


### Features

* 增加快速填写功能 ([5ab4a1e](https://github.com/Jsmond2016/quick-copy-ext/commit/5ab4a1e5522fea9710b011aa3ae5c3042929bed8))

## [1.4.29](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.26...v1.4.29) (2026-05-15)


### Bug Fixes

* include request params in copied feedback ([7b2e066](https://github.com/Jsmond2016/quick-copy-ext/commit/7b2e0668df01eafe9eb79dcdff1df2d0a0f74e3d))

## [1.4.28](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.26...v1.4.28) (2026-05-15)

## [1.4.27](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.26...v1.4.27) (2026-05-15)

## [1.4.26](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.25...v1.4.26) (2026-05-15)


### Bug Fixes

* 去掉复制文本中「详细描述：N/A」默认值，异常原因仅在接口异常时展示 ([d189512](https://github.com/Jsmond2016/quick-copy-ext/commit/d189512eee6b7defe6a1593ed1927e92a367624d))

## [1.4.25](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.24...v1.4.25) (2026-05-15)


### Features

* 配置导入/导出 & 重置 & 导出复制按钮 & 弹框主题色适配 ([b1993eb](https://github.com/Jsmond2016/quick-copy-ext/commit/b1993eb10d5e390f48a507b5ce33895263d1d2e8))

## [1.4.24](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.23...v1.4.24) (2026-05-13)


### Features

* 支持 *.xxx 通配符 origin 匹配 & 备注文本框默认 2 行 & 异常判断修复 ([e0fe3e5](https://github.com/Jsmond2016/quick-copy-ext/commit/e0fe3e59dff3758117efb3317b2eeeb6c6f40773))

## [1.4.23](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.22...v1.4.23) (2026-05-09)


### Features

* **requests:** highlight business response exceptions ([d6a0e08](https://github.com/Jsmond2016/quick-copy-ext/commit/d6a0e0893f194575c3fefc7058d48e91aa0902cf))

## [1.4.22](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.13...v1.4.22) (2026-04-29)


### Bug Fixes

* **apifox:** fallback match legacy paths ([35dd417](https://github.com/Jsmond2016/quick-copy-ext/commit/35dd4172040bb454552718acfac032ceda862679))
* **background:** use compatible timeout type ([95efd59](https://github.com/Jsmond2016/quick-copy-ext/commit/95efd595f86b40783627ec8b3043b457639d4ce4))
* **ci:** avoid yaml not condition syntax ([a818eeb](https://github.com/Jsmond2016/quick-copy-ext/commit/a818eebc7cd2ac5cdff5504395ebdce4f25006f7))
* **ci:** quote workflow condition ([3021193](https://github.com/Jsmond2016/quick-copy-ext/commit/30211934c80d4c72d0c1027229ca6e76eee0d903))
* **ci:** quote workflow if expression ([8b67487](https://github.com/Jsmond2016/quick-copy-ext/commit/8b674877530b065afa7e7ce5718f9e6b784a9a25))
* **popup:** align request method vertically ([c43369a](https://github.com/Jsmond2016/quick-copy-ext/commit/c43369a33de4d63ca8b325a901eaf810c936d440))
* **popup:** rename settings close button ([66044af](https://github.com/Jsmond2016/quick-copy-ext/commit/66044afd8b606e9ca04342a2b95a2f7848fd9c73))


### Features

* improve popup apifox request navigation ([e20fdc4](https://github.com/Jsmond2016/quick-copy-ext/commit/e20fdc4cd2c2bddbbbabd0ca2275c843d437c68a))
* **popup:** refine request history copy ([d67d568](https://github.com/Jsmond2016/quick-copy-ext/commit/d67d568c02ebd0650eb5cfd94f082c0cb14a6ddc))
* **popup:** show extension version ([21d9988](https://github.com/Jsmond2016/quick-copy-ext/commit/21d9988716d8573fe91c17c8d9dcfd6c7f694169))

## [1.4.21](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.13...v1.4.21) (2026-04-27)


### Bug Fixes

* **apifox:** fallback match legacy paths ([35dd417](https://github.com/Jsmond2016/quick-copy-ext/commit/35dd4172040bb454552718acfac032ceda862679))
* **popup:** align request method vertically ([c43369a](https://github.com/Jsmond2016/quick-copy-ext/commit/c43369a33de4d63ca8b325a901eaf810c936d440))
* **popup:** rename settings close button ([66044af](https://github.com/Jsmond2016/quick-copy-ext/commit/66044afd8b606e9ca04342a2b95a2f7848fd9c73))


### Features

* improve popup apifox request navigation ([e20fdc4](https://github.com/Jsmond2016/quick-copy-ext/commit/e20fdc4cd2c2bddbbbabd0ca2275c843d437c68a))
* **popup:** refine request history copy ([d67d568](https://github.com/Jsmond2016/quick-copy-ext/commit/d67d568c02ebd0650eb5cfd94f082c0cb14a6ddc))
* **popup:** show extension version ([21d9988](https://github.com/Jsmond2016/quick-copy-ext/commit/21d9988716d8573fe91c17c8d9dcfd6c7f694169))

## [1.4.20](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.13...v1.4.20) (2026-04-27)


### Bug Fixes

* **apifox:** fallback match legacy paths ([35dd417](https://github.com/Jsmond2016/quick-copy-ext/commit/35dd4172040bb454552718acfac032ceda862679))
* **popup:** align request method vertically ([c43369a](https://github.com/Jsmond2016/quick-copy-ext/commit/c43369a33de4d63ca8b325a901eaf810c936d440))
* **popup:** rename settings close button ([66044af](https://github.com/Jsmond2016/quick-copy-ext/commit/66044afd8b606e9ca04342a2b95a2f7848fd9c73))


### Features

* improve popup apifox request navigation ([e20fdc4](https://github.com/Jsmond2016/quick-copy-ext/commit/e20fdc4cd2c2bddbbbabd0ca2275c843d437c68a))
* **popup:** refine request history copy ([d67d568](https://github.com/Jsmond2016/quick-copy-ext/commit/d67d568c02ebd0650eb5cfd94f082c0cb14a6ddc))
* **popup:** show extension version ([21d9988](https://github.com/Jsmond2016/quick-copy-ext/commit/21d9988716d8573fe91c17c8d9dcfd6c7f694169))

## [1.4.19](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.13...v1.4.19) (2026-04-27)


### Bug Fixes

* **apifox:** fallback match legacy paths ([35dd417](https://github.com/Jsmond2016/quick-copy-ext/commit/35dd4172040bb454552718acfac032ceda862679))
* **popup:** align request method vertically ([c43369a](https://github.com/Jsmond2016/quick-copy-ext/commit/c43369a33de4d63ca8b325a901eaf810c936d440))
* **popup:** rename settings close button ([66044af](https://github.com/Jsmond2016/quick-copy-ext/commit/66044afd8b606e9ca04342a2b95a2f7848fd9c73))


### Features

* improve popup apifox request navigation ([e20fdc4](https://github.com/Jsmond2016/quick-copy-ext/commit/e20fdc4cd2c2bddbbbabd0ca2275c843d437c68a))
* **popup:** refine request history copy ([d67d568](https://github.com/Jsmond2016/quick-copy-ext/commit/d67d568c02ebd0650eb5cfd94f082c0cb14a6ddc))
* **popup:** show extension version ([21d9988](https://github.com/Jsmond2016/quick-copy-ext/commit/21d9988716d8573fe91c17c8d9dcfd6c7f694169))

## [1.4.18](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.13...v1.4.18) (2026-04-24)


### Bug Fixes

* **apifox:** fallback match legacy paths ([35dd417](https://github.com/Jsmond2016/quick-copy-ext/commit/35dd4172040bb454552718acfac032ceda862679))
* **popup:** rename settings close button ([66044af](https://github.com/Jsmond2016/quick-copy-ext/commit/66044afd8b606e9ca04342a2b95a2f7848fd9c73))


### Features

* improve popup apifox request navigation ([e20fdc4](https://github.com/Jsmond2016/quick-copy-ext/commit/e20fdc4cd2c2bddbbbabd0ca2275c843d437c68a))
* **popup:** refine request history copy ([d67d568](https://github.com/Jsmond2016/quick-copy-ext/commit/d67d568c02ebd0650eb5cfd94f082c0cb14a6ddc))

## [1.4.17](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.13...v1.4.17) (2026-04-23)


### Bug Fixes

* **apifox:** fallback match legacy paths ([35dd417](https://github.com/Jsmond2016/quick-copy-ext/commit/35dd4172040bb454552718acfac032ceda862679))
* **popup:** rename settings close button ([66044af](https://github.com/Jsmond2016/quick-copy-ext/commit/66044afd8b606e9ca04342a2b95a2f7848fd9c73))


### Features

* improve popup apifox request navigation ([e20fdc4](https://github.com/Jsmond2016/quick-copy-ext/commit/e20fdc4cd2c2bddbbbabd0ca2275c843d437c68a))
* **popup:** refine request history copy ([d67d568](https://github.com/Jsmond2016/quick-copy-ext/commit/d67d568c02ebd0650eb5cfd94f082c0cb14a6ddc))

## [1.4.16](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.13...v1.4.16) (2026-04-21)


### Bug Fixes

* **popup:** rename settings close button ([66044af](https://github.com/Jsmond2016/quick-copy-ext/commit/66044afd8b606e9ca04342a2b95a2f7848fd9c73))


### Features

* **popup:** refine request history copy ([d67d568](https://github.com/Jsmond2016/quick-copy-ext/commit/d67d568c02ebd0650eb5cfd94f082c0cb14a6ddc))

## [1.4.15](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.13...v1.4.15) (2026-04-20)


### Bug Fixes

* **popup:** rename settings close button ([66044af](https://github.com/Jsmond2016/quick-copy-ext/commit/66044afd8b606e9ca04342a2b95a2f7848fd9c73))

## [1.4.14](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.13...v1.4.14) (2026-04-20)

## [1.4.13](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.12...v1.4.13) (2026-04-18)

## [1.4.12](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.6...v1.4.12) (2026-04-17)


### Bug Fixes

* **copy:** reorder feedback summary layout ([e54717f](https://github.com/Jsmond2016/quick-copy-ext/commit/e54717fe428bd752fa9a55fa360754a24a5755a9))
* normalize apifox preview url ([b37faf2](https://github.com/Jsmond2016/quick-copy-ext/commit/b37faf270522c4f5d6a737b7a31b6bd7e64f2b06))
* persist apifox cache across worker restarts ([1a05d50](https://github.com/Jsmond2016/quick-copy-ext/commit/1a05d50dd7c46c185fa9c6a29f5165bcb287d1bc))
* persist request history across popup opens ([293c798](https://github.com/Jsmond2016/quick-copy-ext/commit/293c7985947a065a26ca855603beeae5aed5417d))


### Features

* optimize popup apifox loading ([bf590c6](https://github.com/Jsmond2016/quick-copy-ext/commit/bf590c697f6687749b860634d6668f375f7e717d))
* restrict request capture by origin ([e9d59ad](https://github.com/Jsmond2016/quick-copy-ext/commit/e9d59adcbff8c9725df56607daad43172192a743))
* support configurable feedback title ([a2933cd](https://github.com/Jsmond2016/quick-copy-ext/commit/a2933cdfaede95b6c5237e150c441310b6760e68))

## [1.4.11](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.6...v1.4.11) (2026-04-17)


### Bug Fixes

* **copy:** reorder feedback summary layout ([e54717f](https://github.com/Jsmond2016/quick-copy-ext/commit/e54717fe428bd752fa9a55fa360754a24a5755a9))
* normalize apifox preview url ([b37faf2](https://github.com/Jsmond2016/quick-copy-ext/commit/b37faf270522c4f5d6a737b7a31b6bd7e64f2b06))
* persist apifox cache across worker restarts ([1a05d50](https://github.com/Jsmond2016/quick-copy-ext/commit/1a05d50dd7c46c185fa9c6a29f5165bcb287d1bc))


### Features

* optimize popup apifox loading ([bf590c6](https://github.com/Jsmond2016/quick-copy-ext/commit/bf590c697f6687749b860634d6668f375f7e717d))
* restrict request capture by origin ([e9d59ad](https://github.com/Jsmond2016/quick-copy-ext/commit/e9d59adcbff8c9725df56607daad43172192a743))
* support configurable feedback title ([a2933cd](https://github.com/Jsmond2016/quick-copy-ext/commit/a2933cdfaede95b6c5237e150c441310b6760e68))

## [1.4.10](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.6...v1.4.10) (2026-04-17)


### Bug Fixes

* **copy:** reorder feedback summary layout ([e54717f](https://github.com/Jsmond2016/quick-copy-ext/commit/e54717fe428bd752fa9a55fa360754a24a5755a9))
* normalize apifox preview url ([b37faf2](https://github.com/Jsmond2016/quick-copy-ext/commit/b37faf270522c4f5d6a737b7a31b6bd7e64f2b06))


### Features

* optimize popup apifox loading ([bf590c6](https://github.com/Jsmond2016/quick-copy-ext/commit/bf590c697f6687749b860634d6668f375f7e717d))
* restrict request capture by origin ([e9d59ad](https://github.com/Jsmond2016/quick-copy-ext/commit/e9d59adcbff8c9725df56607daad43172192a743))
* support configurable feedback title ([a2933cd](https://github.com/Jsmond2016/quick-copy-ext/commit/a2933cdfaede95b6c5237e150c441310b6760e68))

## [1.4.9](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.6...v1.4.9) (2026-04-16)


### Bug Fixes

* **copy:** reorder feedback summary layout ([e54717f](https://github.com/Jsmond2016/quick-copy-ext/commit/e54717fe428bd752fa9a55fa360754a24a5755a9))
* normalize apifox preview url ([b37faf2](https://github.com/Jsmond2016/quick-copy-ext/commit/b37faf270522c4f5d6a737b7a31b6bd7e64f2b06))


### Features

* restrict request capture by origin ([e9d59ad](https://github.com/Jsmond2016/quick-copy-ext/commit/e9d59adcbff8c9725df56607daad43172192a743))
* support configurable feedback title ([a2933cd](https://github.com/Jsmond2016/quick-copy-ext/commit/a2933cdfaede95b6c5237e150c441310b6760e68))

## [1.4.8](https://github.com/Jsmond2016/quick-copy-ext/compare/v1.4.6...v1.4.8) (2026-04-16)


### Bug Fixes

* **copy:** reorder feedback summary layout ([e54717f](https://github.com/Jsmond2016/quick-copy-ext/commit/e54717fe428bd752fa9a55fa360754a24a5755a9))
* normalize apifox preview url ([b37faf2](https://github.com/Jsmond2016/quick-copy-ext/commit/b37faf270522c4f5d6a737b7a31b6bd7e64f2b06))


### Features

* restrict request capture by origin ([e9d59ad](https://github.com/Jsmond2016/quick-copy-ext/commit/e9d59adcbff8c9725df56607daad43172192a743))
* support configurable feedback title ([a2933cd](https://github.com/Jsmond2016/quick-copy-ext/commit/a2933cdfaede95b6c5237e150c441310b6760e68))

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
