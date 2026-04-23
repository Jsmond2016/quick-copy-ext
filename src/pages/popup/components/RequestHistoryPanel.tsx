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
  onToggleRequest: (id: string) => void;
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
            const displayPath = getDisplayPath(request.url);

            return (
              <article
                className={`request-card ${checked ? 'active' : ''}`}
                key={request.id}
                onClick={() => onToggleRequest(request.id)}
              >
                <input
                  checked={checked}
                  onChange={() => onToggleRequest(request.id)}
                  onClick={(event) => event.stopPropagation()}
                  type="checkbox"
                />
                <div className="request-main">
                  <div className="request-line">
                    <span className="method-pill">{request.method.toUpperCase()}</span>
                    {request.apifoxUrl ? (
                      <a
                        className="request-path request-link"
                        href={request.apifoxUrl}
                        onClick={(event) => event.stopPropagation()}
                        rel="noreferrer"
                        target="_blank"
                        title={`${displayPath}\n点击跳转到 Apifox`}
                      >
                        {displayPath}
                      </a>
                    ) : (
                      <span className="request-path" title={request.url}>
                        {displayPath}
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
