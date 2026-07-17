import {
  formatTime,
  getDisplayPath,
  getPageErrorKindLabel,
  getRelatedRequests,
  NetworkRequestRecord,
  PageErrorRecord,
} from '@src/lib/quick-copy';

interface PageErrorPanelProps {
  errors: PageErrorRecord[];
  requests: NetworkRequestRecord[];
  onClear: () => void;
  onCopy: (error: PageErrorRecord) => void;
}

function getErrorLocation(error: PageErrorRecord): string {
  const source = error.filename || error.resourceUrl;
  if (!source) {
    return '-';
  }

  const suffix = `${error.lineNumber ? `:${error.lineNumber}` : ''}${error.columnNumber ? `:${error.columnNumber}` : ''}`;
  return `${getDisplayPath(source) || source}${suffix}`;
}

export function PageErrorPanel({
  errors,
  requests,
  onClear,
  onCopy,
}: PageErrorPanelProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <section className="panel page-error-panel">
      <div className="panel-head">
        <div>
          <span className="panel-kicker page-error-kicker">页面异常</span>
          <h2>{errors.length} 条记录</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onClear}>
          清空记录
        </button>
      </div>

      <div className="page-error-list">
        {errors.map((error) => {
          const relatedRequests = getRelatedRequests(error, requests);

          return (
            <article className="page-error-item" key={error.id}>
              <div className="page-error-item-head">
                <div className="page-error-summary">
                  <span className="request-badge request-badge-danger">
                    {getPageErrorKindLabel(error.kind)}
                  </span>
                  <time dateTime={new Date(error.occurredAt).toISOString()}>
                    {formatTime(error.occurredAt)}
                  </time>
                </div>
                <button
                  className="request-copy-button"
                  type="button"
                  title="复制本条页面异常"
                  aria-label="复制本条页面异常"
                  onClick={() => onCopy(error)}
                >
                  <span className="copy-icon" aria-hidden="true" />
                </button>
              </div>
              <strong className="page-error-message" title={error.message}>
                {error.message}
              </strong>
              <div className="page-error-location" title={getErrorLocation(error)}>
                {getErrorLocation(error)}
              </div>

              {relatedRequests.length > 0 ? (
                <div className="page-error-related">
                  <span>可能关联接口</span>
                  {relatedRequests.map((request) => (
                    <code key={request.id} title={request.url}>
                      {request.method.toUpperCase()} {getDisplayPath(request.url)}
                    </code>
                  ))}
                </div>
              ) : null}

              {error.stack ? (
                <details className="page-error-details">
                  <summary>错误堆栈</summary>
                  <pre>{error.stack}</pre>
                </details>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
