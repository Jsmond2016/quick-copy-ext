import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Quick Copy Ext',
  description: 'Web 异常问题反馈的 Chrome 扩展 — 自动捕获接口信息，一键复制标准化反馈内容',
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/icon-128.png' }],
  ],

  themeConfig: {
    logo: '/icon-128.png',

    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/' },
      { text: '功能特性', link: '/features/' },
      { text: '配置参考', link: '/configuration/' },
      { text: '架构设计', link: '/architecture/' },
      { text: '本地开发', link: '/development/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '概述', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '快速上手', link: '/guide/quick-start' },
            { text: '常见问题', link: '/guide/faq' },
          ],
        },
      ],
      '/features/': [
        {
          text: '功能特性',
          items: [
            { text: '功能总览', link: '/features/' },
            { text: '接口请求捕获', link: '/features/request-capture' },
            { text: 'Apifox 接口关联', link: '/features/apifox-integration' },
            { text: '响应异常规则', link: '/features/response-error-rules' },
            { text: '反馈文本格式', link: '/features/feedback-format' },
            { text: '请求多选与复制', link: '/features/multi-select' },
            { text: '配置导入/导出', link: '/features/config-import-export' },
            { text: '多环境切换', link: '/features/environments' },
            { text: 'Quick Mock (开发者模式)', link: '/features/quick-mock' },
            { text: 'AIO 一键复制 (测试者模式)', link: '/features/aio-copy' },
          ],
        },
      ],
      '/configuration/': [
        {
          text: '配置参考',
          items: [
            { text: '配置概览', link: '/configuration/' },
            { text: '完整配置项参考', link: '/configuration/settings-reference' },
            { text: '监听域名', link: '/configuration/monitored-origins' },
            { text: '接口前缀过滤', link: '/configuration/api-prefixes' },
            { text: '自定义字段', link: '/configuration/custom-fields' },
            { text: '快速填入模板', link: '/configuration/quick-fill-templates' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: '架构设计',
          items: [
            { text: '架构概述', link: '/architecture/' },
            { text: '项目结构', link: '/architecture/project-structure' },
            { text: '数据流说明', link: '/architecture/data-flow' },
            {
              text: '页面模块',
              items: [
                { text: '后台 Service Worker', link: '/architecture/pages/background' },
                { text: '内容脚本', link: '/architecture/pages/content-script' },
                { text: '弹窗 UI', link: '/architecture/pages/popup' },
                { text: '侧边栏', link: '/architecture/pages/sidepanel' },
              ],
            },
            {
              text: '核心库',
              items: [
                { text: '核心库概述', link: '/architecture/lib/' },
                { text: '类型系统', link: '/architecture/lib/types' },
                { text: '反馈文本生成', link: '/architecture/lib/feedback' },
                { text: 'URL 工具函数', link: '/architecture/lib/url' },
                { text: 'Apifox 解析', link: '/architecture/lib/apifox' },
                { text: '响应规则引擎', link: '/architecture/lib/response-rules' },
                { text: '配置管理', link: '/architecture/lib/settings' },
              ],
            },
          ],
        },
      ],
      '/development/': [
        {
          text: '本地开发',
          items: [
            { text: '开发指南', link: '/development/' },
            { text: '环境搭建', link: '/development/setup' },
            { text: '构建与打包', link: '/development/build' },
            { text: '近期代码变更', link: '/development/recent-changes' },
            { text: '版本发布流程', link: '/development/release' },
            { text: '代码规范', link: '/development/code-style' },
          ],
        },
      ],
      '/decisions/': [
        {
          text: '技术决策记录',
          items: [
            { text: '概述', link: '/decisions/' },
            { text: 'Popup 组件重构', link: '/decisions/popup-refactor-notes' },
            { text: 'Apifox 性能优化', link: '/decisions/apifox-performance' },
            { text: '响应规则顺序控制', link: '/decisions/response-rules-order' },
            { text: '后台响应采集改造', link: '/decisions/response-capture-review' },
            { text: '版本管理与打包自动化', link: '/decisions/version-management' },
          ],
        },
      ],
      '/publishing/': [
        {
          text: '发布相关',
          items: [
            { text: 'Chrome Web Store', link: '/publishing/chrome-web-store' },
            { text: 'Edge Add-ons', link: '/publishing/edge-addons' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Jsmond2016/quick-copy-ext' },
    ],

    footer: {
      message: '基于 MIT 协议开源',
      copyright: 'Copyright © 2026 Jsmond2016',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/Jsmond2016/quick-copy-ext/edit/main/docs-site/:path',
      text: '在 GitHub 上编辑此页',
    },

    lastUpdatedText: '最后更新',
  },
})
