import { useEffect, useRef, useState } from 'react';
import {
  clearRecordingPreview,
  DEFAULT_RECORDING_DOWNLOAD_DIRECTORY,
  getRecordingPreview,
  loadRecordingSettings,
  saveRecordingSettings,
  type RecordingSession,
} from '@src/lib/quick-copy';

const EMPTY_SESSION: RecordingSession = { status: 'idle' };
const PLAYBACK_RATES = [0.5, 1, 1.5, 1.8, 2, 2.5] as const;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '读取录屏预览失败。';
}

async function getLatestRecordingSession(): Promise<RecordingSession> {
  const response = await chrome.runtime.sendMessage({ type: 'quick-copy/get-latest-recording-session' }) as {
    ok: boolean;
    data?: RecordingSession;
    error?: string;
  };
  if (!response.ok || !response.data) {
    throw new Error(response.error || '未找到最近录屏。');
  }
  return response.data;
}

async function clearPreviewSession(): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: 'quick-copy/clear-recording-preview' }) as {
    ok: boolean;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(response.error || '清除录屏预览失败。');
  }
}

export function RecordingOptions() {
  const [session, setSession] = useState<RecordingSession>(EMPTY_SESSION);
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadDirectory, setDownloadDirectory] = useState(DEFAULT_RECORDING_DOWNLOAD_DIRECTORY);
  const [savingDirectory, setSavingDirectory] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let activeUrl = '';
    let disposed = false;

    async function loadPreview() {
      setLoading(true);
      setError('');
      try {
        const [nextSession, recordingSettings] = await Promise.all([
          getLatestRecordingSession(),
          loadRecordingSettings(),
        ]);
        if (disposed) return;
        setSession(nextSession);
        setDownloadDirectory(recordingSettings.downloadDirectory);
        if (nextSession.status !== 'saved' || !nextSession.recordingId) {
          return;
        }

        const blob = await getRecordingPreview(nextSession.recordingId);
        if (!blob) {
          throw new Error('本地预览副本不存在，已下载的录屏文件不受影响。');
        }
        activeUrl = URL.createObjectURL(blob);
        if (!disposed) {
          setVideoUrl(activeUrl);
        }
      } catch (loadError) {
        if (!disposed) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadPreview();
    return () => {
      disposed = true;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, []);

  async function handleClearPreview() {
    try {
      await clearRecordingPreview();
      await clearPreviewSession();
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      setVideoUrl('');
      setSession((current) => ({ ...current, recordingId: undefined }));
      setError('本地预览已清除，已下载的录屏文件仍保留在浏览器下载目录。');
    } catch (clearError) {
      setError(getErrorMessage(clearError));
    }
  }

  async function handleSaveDirectory() {
    setSavingDirectory(true);
    setError('');
    try {
      const nextSettings = await saveRecordingSettings({ downloadDirectory });
      setDownloadDirectory(nextSettings.downloadDirectory);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSavingDirectory(false);
    }
  }

  function handlePlaybackRateChange(nextPlaybackRate: number): void {
    setPlaybackRate(nextPlaybackRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextPlaybackRate;
    }
  }

  const hasPreview = Boolean(videoUrl);
  const hasSavedRecording = session.status === 'saved';

  return (
    <main className="recording-options-shell">
      <header className="recording-options-header">
        <div>
          <p className="options-eyebrow">QUICK COPY EXT / EVIDENCE</p>
          <h1>录屏预览</h1>
        </div>
        <p className="options-caption">仅保留最近一条本地预览，不会上传视频。</p>
      </header>

      <section className="recording-path-settings" aria-label="录屏存放位置">
        <div>
          <p className="details-label">录屏存放位置</p>
          <strong>~/Downloads/{downloadDirectory || DEFAULT_RECORDING_DOWNLOAD_DIRECTORY}</strong>
          <p>Chrome 会在浏览器下载目录下创建该子文件夹。路径在开始录制时生效。</p>
        </div>
        <div className="path-input-row">
          <input
            aria-label="下载目录内子路径"
            onChange={(event) => setDownloadDirectory(event.target.value)}
            placeholder="quick-copy-ext"
            value={downloadDirectory}
          />
          <button disabled={savingDirectory} onClick={() => void handleSaveDirectory()} type="button">
            {savingDirectory ? '保存中...' : '保存位置'}
          </button>
        </div>
      </section>

      <section className="preview-workspace" aria-busy={loading}>
        <div className="video-stage">
          {hasPreview ? (
            <video
              className="recording-video"
              controls
              onLoadedMetadata={(event) => {
                event.currentTarget.playbackRate = playbackRate;
              }}
              preload="metadata"
              ref={videoRef}
              src={videoUrl}
            />
          ) : (
            <div className="video-empty-state">
              <span>{loading ? '正在读取最近录屏' : hasSavedRecording ? '本地预览不可用' : '暂无录屏'}</span>
            </div>
          )}
        </div>

        <aside className="recording-details">
          <p className="details-label">最近文件</p>
          <strong>{session.savedFileName || '未生成录屏文件'}</strong>
          <p>{hasPreview ? '可在此检查复现过程，再将已下载文件上传到缺陷平台。' : '开始并停止一次录制后，视频会出现在这里。'}</p>
          {hasPreview ? (
            <>
              <label className="playback-rate-control">
                <span>播放速度</span>
                <select
                  aria-label="播放速度"
                  onChange={(event) => handlePlaybackRateChange(Number(event.target.value))}
                  value={playbackRate}
                >
                  {PLAYBACK_RATES.map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
                </select>
              </label>
              <button className="clear-preview-button" onClick={() => void handleClearPreview()} type="button">
                清除本地预览
              </button>
            </>
          ) : null}
          {error ? <p className="preview-status">{error}</p> : null}
        </aside>
      </section>
    </main>
  );
}
