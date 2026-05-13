import { getDisplayPath, PageSummary } from '@src/lib/quick-copy';

interface PageSummaryPanelProps {
  page: PageSummary;
  pageMonitoringEnabled: boolean;
  onRefresh: () => void;
}

export function PageSummaryPanel({
  page,
  pageMonitoringEnabled,
  onRefresh,
}: PageSummaryPanelProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="panel-kicker">当前页面</span>
          <h2>页面摘要</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onRefresh}>
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
        {page.url && !pageMonitoringEnabled && (
          <div>
            <dt>监听页面</dt>
            <dd style={{ color: 'red' }}>
              否，当前页面不在监听 Origin 范围内，请修改设置 origin
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
