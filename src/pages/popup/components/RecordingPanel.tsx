import { useEffect, useState } from 'react';
import type { RecordingSession } from '@src/lib/quick-copy';

interface RecordingPanelProps {
  enabled: boolean;
  pending: boolean;
  session: RecordingSession;
  supported: boolean;
  onStart: () => void;
  onOpenPreview: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

function formatDuration(session: RecordingSession, now: number): string {
  const elapsedMs = session.status === 'recording' && session.startedAt
    ? Math.max(0, now - session.startedAt)
    : session.elapsedMs ?? 0;
  const seconds = Math.floor(elapsedMs / 1_000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RecordingPanel({
  enabled,
  pending,
  session,
  supported,
  onStart,
  onOpenPreview,
  onPause,
  onResume,
  onStop,
}: RecordingPanelProps) {
  const [now, setNow] = useState(Date.now());
  const isRecording = session.status === 'recording';
  const isPaused = session.status === 'paused';

  useEffect(() => {
    if (!isRecording) {
      return undefined;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  if (!supported) {
    return null;
  }

  return (
    <section className="panel recording-panel">
      <div className="panel-head">
        <div>
          <span className="panel-kicker">复现证据</span>
          <h2>当前标签页录制</h2>
        </div>
        {isRecording || isPaused ? (
          <span className="recording-indicator">
            {isPaused ? '暂停' : 'REC'} {formatDuration(session, now)}
          </span>
        ) : null}
      </div>
      {isRecording ? (
        <p className="recording-hint">录制中。完成复现后重新打开插件并停止保存。</p>
      ) : isPaused ? (
        <p className="recording-hint">录制已暂停，可继续或结束并保存。</p>
      ) : session.status === 'saving' ? (
        <p className="recording-hint">录制已结束，等待浏览器完成保存。</p>
      ) : session.status === 'saved' ? (
        <p className="recording-hint">录屏已保存：{session.savedFileName}。请在缺陷平台上传附件。</p>
      ) : session.status === 'error' ? (
        <p className="recording-hint recording-error">{session.error || '录制失败，请重试。'}</p>
      ) : (
        <p className="recording-hint">录制当前标签页画面，无音频，最长 5 分钟。</p>
      )}
      <button
        className={isRecording ? 'danger-button' : 'ghost-button'}
        disabled={pending || !enabled || session.status === 'saving'}
        onClick={isRecording || isPaused ? onStop : onStart}
        type="button"
      >
        {pending ? '处理中...' : isRecording || isPaused ? '停止并保存' : '开始录制当前标签页'}
      </button>
      {isRecording || isPaused ? (
        <button
          className="text-action-button"
          disabled={pending}
          onClick={isPaused ? onResume : onPause}
          type="button"
        >
          {isPaused ? '继续录制' : '暂停录制'}
        </button>
      ) : null}
      {session.status === 'saved' ? (
        <button
          className="text-action-button"
          disabled={!session.recordingId}
          onClick={onOpenPreview}
          type="button"
        >
          {session.recordingId ? '预览录屏' : '本地预览不可用'}
        </button>
      ) : null}
      {!enabled ? <p className="recording-disabled">当前页面不在监听 Origin 范围内，无法录制。</p> : null}
    </section>
  );
}
