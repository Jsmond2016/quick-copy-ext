import { getDisplayPath, NetworkRequestRecord, QuickCopySettings } from '@src/lib/quick-copy';

interface RequestHistoryPanelProps {
  requests: NetworkRequestRecord[];
  filteredRequests: NetworkRequestRecord[];
  selectedIds: string[];
  loading: boolean;
  errorText: string;
  statusText: string;
  settings: QuickCopySettings;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onClearRequests: () => void;
  onToggleRequest: (id: string, index: number, shiftKey: boolean) => void;
}

function splitRequestPath(rawUrl: string) {
  const fallbackDisplay = getDisplayPath(rawUrl);

  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname || '/';
    const segments = pathname.split('/').filter(Boolean);
    const leaf = segments.at(-1) || pathname;
    const parentSegments = segments.slice(0, -1);
    const parentPath = parentSegments.length > 0 ? `/${parentSegments.join('/')}` : '/';
    const suffix = `${url.search}${url.hash}`;

    return {
      leaf: `${leaf}${suffix}`,
      parentPath,
      title: `${pathname}${suffix}`,
    };
  } catch {
    const [path = rawUrl, suffix = ''] = rawUrl.split(/(?=[?#])/);
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      return {
        leaf: fallbackDisplay,
        parentPath: '',
        title: rawUrl,
      };
    }

    const leaf = segments.at(-1) || path;
    const parentSegments = segments.slice(0, -1);

    return {
      leaf: `${leaf}${suffix}`,
      parentPath: parentSegments.length > 0 ? `/${parentSegments.join('/')}` : '/',
      title: `${path}${suffix}`,
    };
  }
}

export function RequestHistoryPanel({
  requests,
  filteredRequests,
  selectedIds,
  loading,
  errorText,
  statusText,
  settings,
  onSelectAll,
  onClearSelection,
  onClearRequests,
  onToggleRequest,
}: RequestHistoryPanelProps) {
  const abnormalCount = filteredRequests.filter((request) => (request.abnormalReasons?.length ?? 0) > 0).length;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="panel-kicker">捕获接口历史</span>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" type="button" onClick={onSelectAll} disabled={requests.length === 0}>
            全选
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={onClearSelection}
            disabled={selectedIds.length === 0}
          >
            清空选择
          </button>
          <button className="ghost-button" type="button" onClick={onClearRequests} disabled={requests.length === 0}>
            清空记录
          </button>
        </div>
      </div>

      {statusText ? (
        <div className="status-row">
          <span className={`status-dot ${errorText ? 'danger' : loading ? 'pending' : 'success'}`} />
          <p>{statusText}</p>
        </div>
      ) : null}

      <div className="filter-summary">
        当前筛选前缀：{settings.apiPrefixes.length > 0 ? settings.apiPrefixes.join('，') : '不过滤'}
        <strong> · </strong>
        异常 {abnormalCount} 条
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
          filteredRequests.map((request, index) => {
            const checked = selectedIds.includes(request.id);
            const { leaf, parentPath, title } = splitRequestPath(request.url);
            const isAbnormal = (request.abnormalReasons?.length ?? 0) > 0;

            return (
              <article
                className={`request-card ${checked ? 'active' : ''} ${isAbnormal ? 'abnormal' : ''}`}
                key={request.id}
                onClick={(event) => onToggleRequest(request.id, index, event.shiftKey)}
              >
                <input
                  checked={checked}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleRequest(request.id, index, event.shiftKey);
                  }}
                  type="checkbox"
                />
                <div className="request-main">
                  <div className="request-line">
                    <span className="method-pill">{request.method.toUpperCase()}</span>
                    {isAbnormal ? <span className="request-badge request-badge-danger">异常</span> : null}
                    {request.apifoxUrl ? (
                      <a
                        className="request-path request-link"
                        href={request.apifoxUrl}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                        onMouseDown={(event) => {
                          event.stopPropagation();
                        }}
                        rel="noreferrer"
                        target="_blank"
                        title={`${request.apiName ? `接口名: ${request.apiName}\n` : ''}${title}\n点击跳转到 Apifox`}
                      >
                        <span className="request-path-leaf">{leaf}</span>
                        <span className="request-path-parent">{parentPath}</span>
                      </a>
                    ) : (
                      <span className="request-path" title={request.apiName ? `接口名: ${request.apiName}\n${title}` : title}>
                        <span className="request-path-leaf">{leaf}</span>
                        <span className="request-path-parent">{parentPath}</span>
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
