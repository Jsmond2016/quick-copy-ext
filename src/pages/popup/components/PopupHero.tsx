import { useEffect, useState } from 'react';
import { ApifoxCacheStatus, buildEnvironmentUrl, EnvironmentConfig, getApifoxProjectId, getDisplayPath, getOtherEnvironments, PageSummary, QuickCopyMode, RecordingSession } from '@src/lib/quick-copy';

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
  onScreenshot: () => void;
  screenshotPending: boolean;
  screenshotSupported: boolean;
  recording: RecordingSession;
  recordingPending: boolean;
  recordingSupported: boolean;
  onOpenRecordingPreview: () => void;
  onShowRecordingHistory: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStartRecording: () => void;
  onStartWindow: () => void;
  onStopRecording: () => void;
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
  onScreenshot,
  screenshotPending,
  screenshotSupported,
  recording,
  recordingPending,
  recordingSupported,
  onOpenRecordingPreview,
  onShowRecordingHistory,
  onPauseRecording,
  onResumeRecording,
  onStartRecording,
  onStartWindow,
  onStopRecording,
  onToggleSettings,
}: PopupHeroProps) {
  const [confirmMode, setConfirmMode] = useState<'tab' | 'window' | null>(null);
  const [now, setNow] = useState(Date.now());
  const isRecording = recording.status === 'recording';
  const isPaused = recording.status === 'paused';

  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  const duration = Math.floor(((isRecording && recording.startedAt ? now - recording.startedAt : recording.elapsedMs ?? 0) / 1_000));
  const durationText = `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`;
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
      <div className="hero-capture-actions">
        {isRecording || isPaused ? (
          <>
            <button className="hero-capture-button danger" disabled={recordingPending} onClick={onStopRecording} type="button">停止并保存</button>
            <button className="hero-capture-button" disabled={recordingPending} onClick={isPaused ? onResumeRecording : onPauseRecording} type="button">{isPaused ? '继续录制' : '暂停录制'} {durationText}</button>
          </>
        ) : (
          <>
            {screenshotSupported ? <button className="hero-capture-button" disabled={screenshotPending || !page.url.startsWith('http')} onClick={onScreenshot} type="button">{screenshotPending ? '截图处理中' : '截图'}</button> : null}
            {recordingSupported ? <button className="hero-capture-button" disabled={recordingPending || recording.status === 'saving'} onClick={() => setConfirmMode('tab')} type="button">录制当前页面</button> : null}
            {recordingSupported ? <button className="hero-capture-button" disabled={recordingPending || recording.status === 'saving'} onClick={() => setConfirmMode('window')} type="button">录制窗口</button> : null}
          </>
        )}
      </div>
      {confirmMode ? (
        <div className="recording-confirm" role="alertdialog" aria-label="确认开始录制">
          <p>{confirmMode === 'tab' ? '默认录制当前标签页。' : '选择窗口录制可覆盖其中新打开的标签页。'} 无音频，最长 5 分钟。</p>
          <div>
            <button className="text-action-button" onClick={() => setConfirmMode(null)} type="button">取消</button>
            <button className="hero-capture-button confirm" onClick={() => { setConfirmMode(null); confirmMode === 'tab' ? onStartRecording() : onStartWindow(); }} type="button">确认并开始</button>
          </div>
        </div>
      ) : null}
      {recording.status === 'saving' ? <p className="recording-result">录制已结束，等待浏览器完成保存。</p> : null}
      {recording.status === 'saved' ? <p className="recording-result">录屏已保存：{recording.recordingId ? <button className="recording-file-link" onClick={onOpenRecordingPreview} type="button">{recording.savedFileName}</button> : recording.savedFileName}。<button className="recording-file-link" onClick={onShowRecordingHistory} type="button">查看历史</button></p> : null}
      {recording.status === 'error' ? <p className="recording-result recording-error">{recording.error || '录制失败，请重试。'}</p> : null}
    </section>
  );
}
