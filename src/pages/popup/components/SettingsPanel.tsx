import { ChangeEvent } from 'react';
import { QuickCopyMode } from '@src/lib/quick-copy';
import { SettingsFormState } from '@pages/popup/utils/settings-form';

interface SettingsPanelProps {
  form: SettingsFormState;
  savingSettings: boolean;
  isDefaultConfig: boolean;
  onFieldChange: (field: keyof SettingsFormState, value: string) => void;
  onModeChange: (mode: QuickCopyMode) => void;
  onTesterAioConfigChange: (
    index: number,
    field: 'iterationName' | 'bugUrl',
    value: string,
  ) => void;
  onMoveTesterAioConfig: (index: number, direction: 'up' | 'down') => void;
  onAddTesterAioConfig: () => void;
  onRemoveTesterAioConfig: (index: number) => void;
  onCancel: () => void;
  onSave: () => void;
  onReset: () => void;
  onImport: () => void;
  onExport: () => void;
}

export function SettingsPanel({
  form,
  savingSettings,
  isDefaultConfig,
  onFieldChange,
  onModeChange,
  onTesterAioConfigChange,
  onMoveTesterAioConfig,
  onAddTesterAioConfig,
  onRemoveTesterAioConfig,
  onCancel,
  onSave,
  onReset,
  onImport,
  onExport,
}: SettingsPanelProps) {
  function handleChange(field: keyof SettingsFormState) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onFieldChange(field, event.target.value);
    };
  }

  const modeOptions: Array<{
    value: QuickCopyMode;
    label: string;
    description: string;
  }> = [
    { value: 'default', label: '默认', description: '无额外模式' },
    { value: 'developer', label: '开发', description: '显示快速 mock' },
    { value: 'tester', label: '测试', description: '复制并跳转 AIO' },
  ];

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="panel-kicker">自定义配置</span>
          <h2>筛选与附加字段</h2>
        </div>
        <div className="settings-actions" style={{ display: 'flex', gap: 8 }}>
          {!isDefaultConfig && (
            <button className="ghost-button" onClick={onExport} type="button">
              导出配置
            </button>
          )}
          <button className="ghost-button" onClick={onImport} type="button">
            导入配置
          </button>
        </div>
      </div>

      <div className="config-grid">
        <div className="field-block">
          <span>模式</span>
          <div className="mode-switcher" role="radiogroup" aria-label="模式切换">
            {modeOptions.map((option) => (
              <button
                aria-checked={form.mode === option.value}
                className={`mode-switch-option${form.mode === option.value ? ' active' : ''}`}
                key={option.value}
                onClick={() => onModeChange(option.value)}
                role="radio"
                type="button"
              >
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </div>

        {form.mode === 'developer' ? (
          <label className="field-block">
            <span>Quick Mock 扩展 ID</span>
            <input
              className="note-input"
              onChange={handleChange('quickMockTargetExtensionIdInput')}
              placeholder="填写 api_proxy_tool_ext 的扩展 ID"
              type="text"
              value={form.quickMockTargetExtensionIdInput}
            />
            <small>这里要填 `chrome://extensions` 页面里显示的实际扩展 ID，不是公钥，也不是仓库里的环境变量名。</small>
            <small>开发联调时用于跨插件发送 `BATCH_QUICK_MOCK` 消息；未填写或 ID 对不上时无法触发快速 mock。</small>
          </label>
        ) : null}

        {form.mode === 'tester' ? (
          <div className="field-block">
            <span>测试者模式配置</span>
            <div className="tester-config-list">
              {form.testerAioConfigs.map((item, index) => (
                <div className="tester-config-row" key={item.id}>
                  <input
                    className="note-input"
                    onChange={(event) => onTesterAioConfigChange(index, 'iterationName', event.target.value)}
                    placeholder="迭代名称"
                    type="text"
                    value={item.iterationName}
                  />
                  <input
                    className="note-input"
                    onChange={(event) => onTesterAioConfigChange(index, 'bugUrl', event.target.value)}
                    placeholder="AIO 链接"
                    type="url"
                    value={item.bugUrl}
                  />
                  <div className="tester-config-actions">
                    <button
                      aria-label="上移"
                      className="ghost-button icon-only tester-config-icon"
                      disabled={index === 0}
                      onClick={() => onMoveTesterAioConfig(index, 'up')}
                      type="button"
                    >
                      ^
                    </button>
                    <button
                      aria-label="下移"
                      className="ghost-button icon-only tester-config-icon"
                      disabled={index === form.testerAioConfigs.length - 1}
                      onClick={() => onMoveTesterAioConfig(index, 'down')}
                      type="button"
                    >
                      v
                    </button>
                    <button
                      aria-label="删除"
                      className="ghost-button icon-only tester-config-icon tester-config-remove"
                      disabled={form.testerAioConfigs.length === 1}
                      onClick={() => onRemoveTesterAioConfig(index)}
                      type="button"
                    >
                      -
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="ghost-button tester-config-add" onClick={onAddTesterAioConfig} type="button">
              + 添加
            </button>
            <small>保存后，主面板会展示“复制至 AIO”按钮，并支持按迭代名称选择目标链接。</small>
          </div>
        ) : null}

        <label className="field-block">
          <span>复制标题</span>
          <input
            className="note-input"
            onChange={handleChange('feedbackTitle')}
            placeholder="页面信息反馈"
            type="text"
            value={form.feedbackTitle}
          />
          <small>复制内容第一行标题，默认值为“页面信息反馈”，支持自定义。</small>
        </label>

        <label className="field-block">
          <span>监听页面 Origin</span>
          <textarea
            className="note-input"
            onChange={handleChange('originInput')}
            placeholder={'localhost\n*.baidu.com\nhttp://localhost:3000'}
            rows={3}
            value={form.originInput}
          />
          <small>每行一个页面来源，支持 `host`、`host:port`、完整 origin 或 <code>*.example.com</code> 通配符。仅命中这些页面时才会记录接口请求。</small>
        </label>

        <label className="field-block">
          <span>接口前缀过滤</span>
          <textarea
            className="note-input"
            onChange={handleChange('prefixInput')}
            placeholder="/api/saas/"
            rows={1}
            value={form.prefixInput}
          />
          <small>每行一个前缀，支持按路径前缀过滤，例如 `/api/saas/`。</small>
        </label>

        <label className="field-block">
          <span>自定义字段</span>
          <textarea
            className="note-input"
            onChange={handleChange('customFieldsInput')}
            placeholder={'反馈人-张三\n环境-测试环境'}
            rows={1}
            value={form.customFieldsInput}
          />
          <small>每行一个字段，复制结果会自动附带这些内容。</small>
        </label>

        <label className="field-block">
          <span>快速填写配置</span>
          <textarea
            className="note-input"
            onChange={handleChange('quickFillTemplatesInput')}
            placeholder={'为什么接口出错了\n出参不对，xx 字段返回值错了'}
            rows={3}
            value={form.quickFillTemplatesInput}
          />
          <small>使用回车分割常用语。主面板会按每行内容展示为外部下拉选项，支持多选后自动填入备注内容。</small>
        </label>

        <label className="field-block">
          <span>本地 Apifox 导出地址</span>
          <textarea
            className="note-input"
            onChange={handleChange('apifoxExportUrlInput')}
            rows={3}
            value={form.apifoxExportUrlInput}
          />
          <small>示例：http://127.0.0.1:4523/export/openapi?projectId=xxx&specialPurpose=openapi-generator</small>
          <small>保存后会在后台异步刷新接口缓存；若未响应，通常是本地 Apifox 未打开。</small>
        </label>

        <label className="field-block">
          <span>异常响应规则</span>
          <textarea
            className="note-input"
            onChange={handleChange('responseErrorRuleInput')}
            placeholder={
              '[\n  {\n    "label": "无权限",\n    "expression": "res.rtn === 403"\n  },\n  {\n    "label": "接口异常",\n    "expression": "res.rtn !== 0"\n  }\n]'
            }
            rows={6}
            value={form.responseErrorRuleInput}
          />
          <small>接口状态码不是 200 时，直接标记为异常；接口状态码为 200 但命中规则时，也会标记为异常。</small>
          <small>请使用 JSON 数组配置，按书写顺序依次判断；一个接口只会命中第一条满足条件的规则。</small>
          <small>当前仅支持 JSON 数组格式，每一项都需要包含 `label` 和 `expression`。</small>
          <small>当前支持 `res.xxx === value`、`!==`、`&gt;`、`&lt;`，以及可选链形式，如 `res.data?.list?.length === 0`。</small>
        </label>
      </div>

      <div className="settings-actions">
        <button className="ghost-button" onClick={onReset} type="button">
          重置
        </button>
        <button className="ghost-button" onClick={onCancel} type="button">
          取消
        </button>
        <button
          className="primary-button compact"
          disabled={savingSettings}
          onClick={onSave}
          type="button"
        >
          {savingSettings ? '保存中...' : '保存配置'}
        </button>
      </div>
      <p className="settings-hint">接口前缀与自定义字段保存后立即生效；Apifox 地址保存后会在后台异步刷新。</p>
    </section>
  );
}
