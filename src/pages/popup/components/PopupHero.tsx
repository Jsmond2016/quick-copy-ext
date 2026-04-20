import { ApifoxCacheStatus } from '@src/lib/quick-copy';

interface PopupHeroProps {
  apifoxStatus: ApifoxCacheStatus;
  apifoxExportUrl: string;
  refreshingApifox: boolean;
  showSettings: boolean;
  onRefreshApifox: () => void;
  onToggleSettings: () => void;
}

export function PopupHero({
  apifoxStatus,
  apifoxExportUrl,
  refreshingApifox,
  showSettings,
  onRefreshApifox,
  onToggleSettings,
}: PopupHeroProps) {
  return (
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
      <p>自动汇总页面与接口请求，便于快速复制反馈。</p>
      <div className="hero-subline">
        {apifoxStatus.ready
          ? `Apifox 已就绪，已缓存 ${apifoxStatus.endpointCount} 条接口。`
          : apifoxExportUrl
            ? apifoxStatus.error || 'Apifox 尚未就绪，可点击右上角刷新重试。'
            : '未配置 Apifox 导出地址，复制时将不会补充 Apifox 链接。'}
      </div>
    </section>
  );
}
