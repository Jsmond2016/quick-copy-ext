import { ApifoxCacheStatus, buildEnvironmentUrl, EnvironmentConfig, getApifoxProjectId, getDisplayPath, getOtherEnvironments, PageSummary, QuickCopyMode } from '@src/lib/quick-copy';

interface PopupHeroProps {
  apifoxStatus: ApifoxCacheStatus;
  apifoxExportUrl: string;
  refreshingApifox: boolean;
  page: PageSummary;
  pageMonitoringEnabled: boolean;
  showSettings: boolean;
  mode: QuickCopyMode;
  environments: EnvironmentConfig[];
  onRefreshApifox: () => void;
  onToggleSettings: () => void;
}

export function PopupHero({
  apifoxStatus,
  apifoxExportUrl,
  refreshingApifox,
  page,
  pageMonitoringEnabled,
  showSettings,
  mode,
  environments,
  onRefreshApifox,
  onToggleSettings,
}: PopupHeroProps) {
  const apifoxProjectId = getApifoxProjectId(apifoxExportUrl);
  const apifoxLabel = apifoxProjectId ? (
    <a
      href={`https://app.apifox.com/project/${apifoxProjectId}`}
      rel="noreferrer"
      target="_blank"
    >
      Apifox
    </a>
  ) : (
    <span>Apifox</span>
  );

  return (
    <section className="hero-card">
      <div className="hero-topbar">
        <div className="hero-title-group">
          <div className="hero-label">Quick Copy Ext</div>
          <h1>页面信息一键复制</h1>
          <p>自动汇总页面与接口请求，便于快速复制反馈。</p>
        </div>
        <div className="hero-actions">
          {mode === 'developer'
            ? getOtherEnvironments(page.url, environments).map((env) => (
                <a
                  key={env.name}
                  href={buildEnvironmentUrl(env.url, page.url) || '#'}
                  rel="noreferrer"
                  target="_blank"
                  className="env-badge"
                  title={`跳转到 ${env.name}: ${env.url}`}
                >
                  {env.name.toUpperCase()}
                </a>
              ))
            : null}
          <div className={`apifox-badge ${apifoxStatus.ready ? 'ready' : 'idle'}`}>
            <span className="apifox-badge-dot" />
            {apifoxLabel}
          </div>
          <button
            aria-label="刷新 Apifox 接口信息"
            className="icon-button icon-only"
            disabled={refreshingApifox || !apifoxExportUrl}
            onClick={onRefreshApifox}
            type="button"
          >
            {refreshingApifox ? '...' : '↻'}
          </button>
          <button
            className={`icon-button ${showSettings ? 'active' : ''}`}
            onClick={onToggleSettings}
            type="button"
          >
            {showSettings ? '返回' : '设置'}
          </button>
        </div>
      </div>
      <div className="hero-subline">
        {apifoxStatus.ready
          ? `Apifox 已就绪，已缓存 ${apifoxStatus.endpointCount} 条接口。`
          : apifoxExportUrl
            ? apifoxStatus.error || 'Apifox 尚未就绪，可点击右上角刷新重试。'
            : '未配置 Apifox 项目 ID，复制时将不会补充 Apifox 链接。'}
      </div>
      <dl className="hero-page-meta">
        <div>
          <dt>标题</dt>
          <dd title={page.title}>{page.title || '-'}</dd>
        </div>
        <div>
          <dt>URL</dt>
          <dd title={page.url}>{getDisplayPath(page.url) || '-'}</dd>
        </div>
      </dl>
      {page.url && !pageMonitoringEnabled ? (
        <p className="hero-page-warning">当前页面不在监听 Origin 范围内，请修改设置 origin。</p>
      ) : null}
    </section>
  );
}
