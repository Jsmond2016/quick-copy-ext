import { useEffect, useMemo, useState } from 'react';
import {
  buildFeedbackText,
  formatDuration,
  formatTime,
  getDefaultSettings,
  getDisplayPath,
  getTraceId,
  loadSettings,
  matchesApiPrefixes,
  NetworkRequestRecord,
  PageSummary,
  QuickCopySettings,
  RuntimeResponseMessage,
  saveSettings,
  stringifyLines,
  parseLines,
} from '@src/lib/quick-copy';

const DEFAULT_PAGE: PageSummary = {
  title: '',
  url: '',
};

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getTabRequests(tabId: number): Promise<NetworkRequestRecord[]> {
  const response = (await chrome.runtime.sendMessage({
    type: 'quick-copy/get-tab-requests',
    tabId,
  })) as RuntimeResponseMessage;

  if (!response.ok) {
    throw new Error(response.error);
  }

  return response.data;
}

export default function Popup() {
  const [page, setPage] = useState<PageSummary>(DEFAULT_PAGE);
  const [requests, setRequests] = useState<NetworkRequestRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [tabId, setTabId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [statusText, setStatusText] = useState('正在读取当前页面请求记录...');
  const [errorText, setErrorText] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(
    null,
  );
  const [settings, setSettings] = useState<QuickCopySettings>(getDefaultSettings());
  const [prefixInput, setPrefixInput] = useState(stringifyLines(getDefaultSettings().apiPrefixes));
  const [customFieldsInput, setCustomFieldsInput] = useState(
    stringifyLines(getDefaultSettings().customFields),
  );

  const filteredRequests = useMemo(
    () => requests.filter((request) => matchesApiPrefixes(request.url, settings.apiPrefixes)),
    [requests, settings.apiPrefixes],
  );

  const selectedRequests = useMemo(
    () => filteredRequests.filter((request) => selectedIds.includes(request.id)),
    [filteredRequests, selectedIds],
  );

  async function loadData() {
    setLoading(true);
    setErrorText('');
    setStatusText('正在读取当前页面请求记录...');

    try {
      const tab = await getActiveTab();

      if (!tab?.id) {
        throw new Error('未获取到当前标签页，请在普通网页中打开插件。');
      }

      setTabId(tab.id);
      setPage({
        title: tab.title ?? '',
        url: tab.url ?? '',
      });

      const nextRequests = await getTabRequests(tab.id);
      setRequests(nextRequests);
      setSelectedIds((current) =>
        current.filter((id) => nextRequests.some((request) => request.id === id)),
      );
      setStatusText(
        nextRequests.length > 0
          ? `已加载 ${nextRequests.length} 条接口记录，可勾选后复制。`
          : '暂未捕获到接口请求，请先在页面上执行相关操作后再刷新。',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '读取请求记录失败。';
      setRequests([]);
      setSelectedIds([]);
      setErrorText(message);
      setStatusText(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);
      setPrefixInput(stringifyLines(loadedSettings.apiPrefixes));
      setCustomFieldsInput(stringifyLines(loadedSettings.customFields));
      await loadData();
    })();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filteredRequests.some((request) => request.id === id)),
    );
  }, [filteredRequests]);

  function toggleRequest(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function selectAll() {
    setSelectedIds(filteredRequests.map((request) => request.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function clearCurrentTabRequests() {
    if (tabId === null) {
      return;
    }

    setLoading(true);
    setErrorText('');
    setStatusText('正在清空当前标签页记录...');

    try {
      await chrome.runtime.sendMessage({
        type: 'quick-copy/clear-tab-requests',
        tabId,
      });

      setRequests([]);
      setSelectedIds([]);
      setStatusText('当前标签页记录已清空。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '清空记录失败。';
      setErrorText(message);
      setStatusText(message);
    } finally {
      setLoading(false);
    }
  }

  async function copyFeedback() {
    setCopying(true);
    setErrorText('');

    try {
      const text = buildFeedbackText({
        page,
        requests: selectedRequests,
        note,
        screenshotLabel: 'N/A（当前版本暂未启用自动截图）',
        customFields: settings.customFields,
      });

      await navigator.clipboard.writeText(text);
      setStatusText(`复制成功，已写入 ${selectedRequests.length} 条接口信息。`);
      setToast({
        type: 'success',
        text: `复制成功，已写入 ${selectedRequests.length} 条接口信息。`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '复制失败。';
      setErrorText(message);
      setStatusText(message);
      setToast({ type: 'error', text: message });
    } finally {
      setCopying(false);
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    setErrorText('');

    try {
      const nextSettings: QuickCopySettings = {
        apiPrefixes: parseLines(prefixInput),
        customFields: parseLines(customFieldsInput),
      };

      await saveSettings(nextSettings);
      setSettings(nextSettings);
      setStatusText('配置已保存，请刷新页面后再使用新配置。');
      setToast({
        type: 'info',
        text: '配置已保存，请刷新当前页面以应用新设置。',
      });
      setShowSettings(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存配置失败。';
      setErrorText(message);
      setStatusText(message);
      setToast({ type: 'error', text: message });
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <main className="popup-shell">
      {toast ? (
        <div className={`toast toast-${toast.type}`}>
          {toast.text}
        </div>
      ) : null}

      <section className="hero-card">
        <div className="hero-topbar">
          <div className="hero-label">Quick Copy Ext</div>
          <button
            className={`icon-button ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings((current) => !current)}
            type="button"
          >
            {showSettings ? '关闭设置' : '设置'}
          </button>
        </div>
        <h1>异常反馈一键复制</h1>
        <p>
          自动汇总当前页面与接口请求信息，减少补充沟通，帮助前后端更快复现问题。
        </p>
      </section>

      {showSettings ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">自定义配置</span>
              <h2>筛选与附加字段</h2>
            </div>
          </div>

          <div className="config-grid">
            <label className="field-block">
              <span>接口前缀过滤</span>
              <textarea
                className="note-input"
                onChange={(event) => setPrefixInput(event.target.value)}
                placeholder="/api/saas/"
                rows={3}
                value={prefixInput}
              />
              <small>每行一个前缀，支持按路径前缀过滤，例如 `/api/saas/`。</small>
            </label>

            <label className="field-block">
              <span>自定义字段</span>
              <textarea
                className="note-input"
                onChange={(event) => setCustomFieldsInput(event.target.value)}
                placeholder={'反馈人-张三\n环境-测试环境'}
                rows={3}
                value={customFieldsInput}
              />
              <small>每行一个字段，复制结果会自动附带这些内容。</small>
            </label>
          </div>

          <div className="settings-actions">
            <button
              className="ghost-button"
              onClick={() => setShowSettings(false)}
              type="button"
            >
              取消
            </button>
            <button
              className="primary-button compact"
              disabled={savingSettings}
              onClick={() => void handleSaveSettings()}
              type="button"
            >
              {savingSettings ? '保存中...' : '保存配置'}
            </button>
          </div>
          <p className="settings-hint">保存后请刷新当前页面，再使用新的过滤规则与自定义字段。</p>
        </section>
      ) : (
        <>
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">当前页面</span>
                <h2>页面基础信息</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => void loadData()}>
                刷新
              </button>
            </div>

            <dl className="page-meta">
              <div>
                <dt>标题</dt>
                <dd title={page.title}>{page.title || 'N/A'}</dd>
              </div>
              <div>
                <dt>URL</dt>
                <dd title={page.url}>{page.url || 'N/A'}</dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">接口历史</span>
                <h2>捕获到的请求</h2>
              </div>
              <div className="inline-actions">
                <button className="ghost-button" type="button" onClick={selectAll} disabled={requests.length === 0}>
                  全选
                </button>
                <button className="ghost-button" type="button" onClick={clearSelection} disabled={selectedIds.length === 0}>
                  清空选择
                </button>
                <button className="ghost-button" type="button" onClick={() => void clearCurrentTabRequests()} disabled={requests.length === 0}>
                  清空记录
                </button>
              </div>
            </div>

            <div className="status-row">
              <span className={`status-dot ${errorText ? 'danger' : loading ? 'pending' : 'success'}`} />
              <p>{statusText}</p>
            </div>

            <div className="filter-summary">
              当前筛选前缀：{settings.apiPrefixes.length > 0 ? settings.apiPrefixes.join('，') : '不过滤'}
              <strong> · </strong>
              命中 {filteredRequests.length} / {requests.length} 条请求
            </div>

            <div className="request-list">
              {filteredRequests.length === 0 ? (
                <div className="empty-state">
                  <strong>当前筛选下没有接口记录</strong>
                  <span>先在页面触发请求，或调整接口前缀后再点击“刷新”。</span>
                </div>
              ) : (
                filteredRequests.map((request) => {
                  const checked = selectedIds.includes(request.id);

                  return (
                    <label className={`request-card ${checked ? 'active' : ''}`} key={request.id}>
                      <input
                        checked={checked}
                        onChange={() => toggleRequest(request.id)}
                        type="checkbox"
                      />
                      <div className="request-main">
                        <div className="request-line">
                          <span className="method-pill">{request.method.toUpperCase()}</span>
                          <span className="request-path" title={request.url}>
                            {getDisplayPath(request.url)}
                          </span>
                        </div>
                        <div className="request-meta">
                          <span>traceId: {getTraceId(request.headers)}</span>
                          <span>状态: {request.statusCode ?? request.error ?? '进行中'}</span>
                          <span>耗时: {formatDuration(request.startedAt, request.completedAt)}</span>
                          <span>时间: {formatTime(request.startedAt)}</span>
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">补充说明</span>
                <h2>备注内容</h2>
              </div>
              <span className="counter">{selectedRequests.length} 项已选</span>
            </div>

            <textarea
              className="note-input"
              onChange={(event) => setNote(event.target.value)}
              placeholder="可补充复现步骤、期望结果、异常表现等说明。"
              rows={4}
              value={note}
            />

            <button
              className="primary-button"
              disabled={copying || selectedIds.length === 0}
              onClick={() => void copyFeedback()}
              type="button"
            >
              {copying ? '复制中...' : '复制异常反馈'}
            </button>
          </section>
        </>
      )}
    </main>
  );
}
