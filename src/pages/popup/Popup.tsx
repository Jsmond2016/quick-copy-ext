import { useEffect, useMemo, useState } from 'react';
import {
  ApifoxCacheStatus,
  ApifoxMatchesResponse,
  ApifoxRefreshResponse,
  ApifoxStatusResponse,
  buildFeedbackText,
  getDefaultSettings,
  getDisplayPath,
  loadSettings,
  matchesMonitoredOrigins,
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

const DEFAULT_APIFOX_STATUS: ApifoxCacheStatus = {
  ready: false,
  sourceUrl: '',
  endpointCount: 0,
};

function isUnknownMessageTypeError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unknown message type.';
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

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

async function getApifoxStatus(): Promise<ApifoxCacheStatus> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'quick-copy/get-apifox-status',
    })) as ApifoxStatusResponse;

    if (!response.ok) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    if (!isUnknownMessageTypeError(error)) {
      throw error;
    }

    return {
      ready: false,
      sourceUrl: '',
      endpointCount: 0,
    };
  }
}

async function refreshApifoxData(exportUrl: string): Promise<ApifoxCacheStatus> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'quick-copy/refresh-apifox-data',
      exportUrl,
    })) as ApifoxRefreshResponse;

    if (!response.ok) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    if (!isUnknownMessageTypeError(error)) {
      throw error;
    }

    throw new Error('当前扩展后台不支持 Apifox 缓存刷新，请重新加载扩展。');
  }
}

async function clearApifoxData(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({
      type: 'quick-copy/clear-apifox-data',
    });
  } catch (error) {
    if (!isUnknownMessageTypeError(error)) {
      throw error;
    }
  }
}

async function getApifoxMatches(
  requests: Pick<NetworkRequestRecord, 'url' | 'method'>[],
): Promise<Record<string, string>> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'quick-copy/get-apifox-matches',
      requests,
    })) as ApifoxMatchesResponse;

    if (!response.ok) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    if (!isUnknownMessageTypeError(error)) {
      throw error;
    }

    throw new Error('当前扩展后台不支持 Apifox 匹配，请重新加载扩展。');
  }
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
  const [refreshingApifox, setRefreshingApifox] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [statusText, setStatusText] = useState('正在读取当前页面请求记录...');
  const [errorText, setErrorText] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(
    null,
  );
  const [settings, setSettings] = useState<QuickCopySettings>(getDefaultSettings());
  const [feedbackTitleInput, setFeedbackTitleInput] = useState(getDefaultSettings().feedbackTitle);
  const [originInput, setOriginInput] = useState(stringifyLines(getDefaultSettings().monitoredOrigins));
  const [prefixInput, setPrefixInput] = useState(stringifyLines(getDefaultSettings().apiPrefixes));
  const [customFieldsInput, setCustomFieldsInput] = useState(
    stringifyLines(getDefaultSettings().customFields),
  );
  const [apifoxExportUrlInput, setApifoxExportUrlInput] = useState(
    getDefaultSettings().apifoxExportUrl,
  );
  const [apifoxStatus, setApifoxStatus] = useState<ApifoxCacheStatus>(DEFAULT_APIFOX_STATUS);

  const filteredRequests = useMemo(
    () => requests.filter((request) => matchesApiPrefixes(request.url, settings.apiPrefixes)),
    [requests, settings.apiPrefixes],
  );

  const selectedRequests = useMemo(
    () => filteredRequests.filter((request) => selectedIds.includes(request.id)),
    [filteredRequests, selectedIds],
  );
  const pageMonitoringEnabled = useMemo(
    () => matchesMonitoredOrigins(page.url, settings.monitoredOrigins),
    [page.url, settings.monitoredOrigins],
  );

  async function loadData(currentSettings = settings) {
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
      const nextPageUrl = tab.url ?? '';
      const isMonitoredPage = matchesMonitoredOrigins(nextPageUrl, currentSettings.monitoredOrigins);
      setStatusText(
        nextRequests.length > 0
          ? `已加载 ${nextRequests.length} 条接口记录，可勾选后复制。`
          : isMonitoredPage
            ? '暂未捕获到接口请求，请先在页面上执行相关操作后再刷新。'
            : '当前页面不在监听 Origin 范围内，插件不会记录这里的接口请求。',
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
      setFeedbackTitleInput(loadedSettings.feedbackTitle);
      setOriginInput(stringifyLines(loadedSettings.monitoredOrigins));
      setPrefixInput(stringifyLines(loadedSettings.apiPrefixes));
      setCustomFieldsInput(stringifyLines(loadedSettings.customFields));
      setApifoxExportUrlInput(loadedSettings.apifoxExportUrl);
      const currentApifoxStatus = loadedSettings.apifoxExportUrl
        ? await getApifoxStatus()
        : DEFAULT_APIFOX_STATUS;
      setApifoxStatus(currentApifoxStatus);
      await loadData(loadedSettings);
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

  async function runApifoxRefresh(
    exportUrl: string,
    options?: {
      successText?: string;
      fallbackErrorText?: string;
      preserveStatusTextOnError?: boolean;
      toastOnSuccess?: boolean;
      toastOnError?: boolean;
    },
  ) {
    setRefreshingApifox(true);

    try {
      const nextStatus = await refreshApifoxData(exportUrl);
      setApifoxStatus(nextStatus);

      if (options?.successText) {
        setStatusText(options.successText);
      }

      if (options?.toastOnSuccess && options.successText) {
        setToast({
          type: 'success',
          text: options.successText,
        });
      }

      return nextStatus;
    } catch (error) {
      const message = getErrorMessage(error, options?.fallbackErrorText ?? '刷新 Apifox 数据失败。');
      setApifoxStatus({
        ready: false,
        sourceUrl: exportUrl.trim(),
        endpointCount: 0,
        error: message,
      });
      setErrorText(message);

      if (!options?.preserveStatusTextOnError) {
        setStatusText(message);
      }

      if (options?.toastOnError) {
        setToast({ type: 'error', text: message });
      }

      throw error;
    } finally {
      setRefreshingApifox(false);
    }
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
      const apifoxMatches =
        apifoxStatus.ready && selectedRequests.length > 0
          ? await getApifoxMatches(selectedRequests.map(({ url, method }) => ({ url, method })))
          : {};
      const requestsWithApifox = selectedRequests.map((request) => ({
        ...request,
        apifoxUrl: apifoxMatches[`${request.method.toUpperCase()} ${request.url}`],
      }));

      const text = buildFeedbackText({
        page,
        requests: requestsWithApifox,
        feedbackTitle: settings.feedbackTitle,
        note,
        screenshotLabel: 'N/A',
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
        feedbackTitle: feedbackTitleInput.trim() || getDefaultSettings().feedbackTitle,
        monitoredOrigins: parseLines(originInput),
        apiPrefixes: parseLines(prefixInput),
        customFields: parseLines(customFieldsInput),
        apifoxExportUrl: apifoxExportUrlInput.trim(),
      };

      if (!nextSettings.apifoxExportUrl) {
        await clearApifoxData();
        setApifoxStatus(DEFAULT_APIFOX_STATUS);
      } else {
        setApifoxStatus({
          ready: false,
          sourceUrl: nextSettings.apifoxExportUrl,
          endpointCount: 0,
        });
      }

      await saveSettings(nextSettings);
      setSettings(nextSettings);
      const savedStatusText = nextSettings.apifoxExportUrl
        ? '配置已保存，监听范围与筛选规则已生效，Apifox 接口信息正在后台刷新。'
        : '配置已保存，新的监听范围、过滤规则与 Apifox 设置已生效。';
      setStatusText(savedStatusText);
      setToast({
        type: 'info',
        text: nextSettings.apifoxExportUrl
          ? '配置已保存，Apifox 接口信息正在后台刷新。'
          : '配置已保存，监听范围已更新，且已清空 Apifox 缓存。',
      });
      setShowSettings(false);
      await loadData(nextSettings);

      if (nextSettings.apifoxExportUrl) {
        void runApifoxRefresh(nextSettings.apifoxExportUrl, {
          successText: 'Apifox 接口信息已在后台刷新完成。',
          fallbackErrorText: '后台刷新 Apifox 数据失败。',
          toastOnSuccess: true,
          toastOnError: true,
          preserveStatusTextOnError: true,
        }).catch(() => undefined);
      }
    } catch (error) {
      const message = getErrorMessage(error, '保存配置失败。');
      setErrorText(message);
      setStatusText(message);
      setToast({ type: 'error', text: message });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleRefreshApifox() {
    if (!settings.apifoxExportUrl) {
      setToast({
        type: 'info',
        text: '请先在设置中填写本地 Apifox 导出地址。',
      });
      setShowSettings(true);
      return;
    }

    setErrorText('');
    setStatusText('正在刷新 Apifox 接口信息...');

    try {
      const nextStatus = await runApifoxRefresh(settings.apifoxExportUrl, {
        fallbackErrorText: '刷新 Apifox 数据失败。',
      });
      const successText = `Apifox 接口信息已刷新，共加载 ${nextStatus.endpointCount} 条接口。`;
      setStatusText(successText);
      setToast({
        type: 'success',
        text: successText,
      });
    } catch (error) {
      const message = getErrorMessage(error, '刷新 Apifox 数据失败。');
      setToast({ type: 'error', text: message });
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
          <div>
            <div className="hero-label">Quick Copy Ext</div>
            <h1>页面信息一键复制</h1>
          </div>
          <div className="hero-actions">
            <div className={`apifox-badge ${apifoxStatus.ready ? 'ready' : 'idle'}`}>
              <span className="apifox-badge-dot" />
              <span>Apifox</span>
            </div>
            <button
              aria-label="刷新 Apifox 接口信息"
              className="icon-button icon-only"
              disabled={refreshingApifox || !settings.apifoxExportUrl}
              onClick={() => void handleRefreshApifox()}
              type="button"
            >
              {refreshingApifox ? '...' : '↻'}
            </button>
            <button
              className={`icon-button ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings((current) => !current)}
              type="button"
            >
              {showSettings ? '关闭设置' : '设置'}
            </button>
          </div>
        </div>
        <p>自动汇总页面与接口请求，便于快速复制反馈。</p>
        <div className="hero-subline">
          {apifoxStatus.ready
            ? `Apifox 已就绪，已缓存 ${apifoxStatus.endpointCount} 条接口。`
            : settings.apifoxExportUrl
              ? apifoxStatus.error || 'Apifox 尚未就绪，可点击右上角刷新重试。'
              : '未配置 Apifox 导出地址，复制时将不会补充 Apifox 链接。'}
        </div>
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
              <span>复制标题</span>
              <input
                className="note-input"
                onChange={(event) => setFeedbackTitleInput(event.target.value)}
                placeholder="页面信息反馈"
                type="text"
                value={feedbackTitleInput}
              />
              <small>复制内容第一行标题，默认值为“页面信息反馈”，支持自定义。</small>
            </label>

            <label className="field-block">
              <span>监听页面 Origin</span>
              <textarea
                className="note-input"
                onChange={(event) => setOriginInput(event.target.value)}
                placeholder={'localhost\n127.0.0.1\nhttp://localhost:3000'}
                rows={3}
                value={originInput}
              />
              <small>每行一个页面来源，支持 `host`、`host:port` 或完整 origin。仅命中这些页面时才会记录接口请求。</small>
            </label>

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

            <label className="field-block">
              <span>本地 Apifox 导出地址</span>
              <textarea
                className="note-input"
                onChange={(event) => setApifoxExportUrlInput(event.target.value)}
                placeholder="http://127.0.0.1:4523/export/openapi?projectId=xxx&specialPurpose=openapi-generator"
                rows={3}
                value={apifoxExportUrlInput}
              />
              <small>保存后会在后台异步刷新接口缓存；如果未响应，通常是本地 Apifox 未打开。</small>
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
          <p className="settings-hint">接口前缀与自定义字段保存后立即生效；Apifox 地址保存后会在后台异步刷新。</p>
        </section>
      ) : (
        <>
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">当前页面</span>
                <h2>页面摘要</h2>
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
                <dd title={page.url}>{getDisplayPath(page.url) || 'N/A'}</dd>
              </div>
              <div>
                <dt>监听页面</dt>
                <dd>{page.url ? (pageMonitoringEnabled ? '是，当前页面会记录接口请求' : '否，当前页面不在监听 Origin 范围内') : 'N/A'}</dd>
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
              {copying ? '复制中...' : '复制页面接口信息'}
            </button>
          </section>
        </>
      )}
    </main>
  );
}
