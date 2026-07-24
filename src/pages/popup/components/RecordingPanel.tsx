import { useEffect, useState } from 'react';
import type { RecordingSession } from '@src/lib/quick-copy';

interface RecordingPanelProps {
  enabled: boolean;
  pending: boolean;
  session: RecordingSession;
  supported: boolean;
  onStart: () => void;
  onStartWindow: () => void;
  onOpenPreview: () => void;
  onShowHistory: () => void;
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
  onStartWindow,
  onOpenPreview,
  onShowHistory,
  onPause,
  onResume,
  onStop,
}: RecordingPanelProps) {
  const [now, setNow] = useState(Date.now());
  const isRecording = session.status === 'recording';
  const isPaused = session.status === 'paused';
  const canControlRecording = isRecording || isPaused;

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
        <h2>视频录制</h2>
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
        <p className="recording-hint">
          录屏已保存：
          {session.recordingId ? (
            <button className="recording-file-link" onClick={onOpenPreview} type="button">
              {session.savedFileName}
            </button>
          ) : (
            session.savedFileName
          )}
          。请在缺陷平台上传附件。或者你可以点击
          <button className="recording-file-link" onClick={onShowHistory} type="button">查看历史</button>
          查看已有录屏。
        </p>
      ) : session.status === 'error' ? (
        <p className="recording-hint recording-error">{session.error || '录制失败，请重试。'}</p>
      ) : (
        <p className="recording-hint">默认录制当前标签页；选择窗口录制可覆盖其中新打开的标签页；无音频，最长 5 分钟。</p>
      )}
      <button
        className={isRecording || isPaused ? 'danger-button' : 'recording-start-button'}
        disabled={pending || session.status === 'saving' || (!canControlRecording && !enabled)}
        onClick={isRecording || isPaused ? onStop : onStart}
        type="button"
      >
        {!pending && !isRecording && !isPaused ? <span aria-hidden="true" className="recording-camera-icon" /> : null}
        {pending ? '处理中...' : isRecording || isPaused ? '停止并保存' : '录制当前标签页'}
      </button>
      {!isRecording && !isPaused ? (
        <button
          className="text-action-button"
          disabled={pending || !enabled || session.status === 'saving'}
          onClick={onStartWindow}
          type="button"
        >
          录制当前窗口（含新标签页）
        </button>
      ) : null}
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
      {!enabled && !canControlRecording ? <p className="recording-disabled">当前页面不在监听 Origin 范围内，无法开始录制。</p> : null}
    </section>
  );
}
