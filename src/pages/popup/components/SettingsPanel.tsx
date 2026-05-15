import { ChangeEvent } from 'react';
import { SettingsFormState } from '@pages/popup/utils/settings-form';

interface SettingsPanelProps {
  form: SettingsFormState;
  savingSettings: boolean;
  isDefaultConfig: boolean;
  onFieldChange: (field: keyof SettingsFormState, value: string) => void;
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
          <input
            className="note-input"
            onChange={handleChange('responseErrorRuleInput')}
            placeholder="res.rtn !== 0"
            type="text"
            value={form.responseErrorRuleInput}
          />
          <small>接口状态码不是 200 时，直接标记为异常；接口状态码为 200 但命中规则时，也会标记为异常。</small>
          <small>当前支持 res.xxx === value、!==、&gt;、&lt; 等简单比较，例如 res.rtn !== 0。</small>
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
