import { saveRecordingPreview } from '@src/lib/quick-copy';
import type { RecordingSource } from '@src/lib/quick-copy';

interface StartRecordingMessage {
  type: 'quick-copy/offscreen-start-recording';
  tabId: number;
  streamId: string;
  fileName: string;
  source?: RecordingSource;
}

interface StopRecordingMessage {
  type: 'quick-copy/offscreen-stop-recording';
  tabId: number;
}

interface PauseRecordingMessage {
  type: 'quick-copy/offscreen-pause-recording';
  tabId: number;
}

interface ResumeRecordingMessage {
  type: 'quick-copy/offscreen-resume-recording';
  tabId: number;
}

interface ReleaseRecordingMessage {
  type: 'quick-copy/offscreen-release-recording';
  blobUrl: string;
}

type OffscreenMessage =
  | StartRecordingMessage
  | StopRecordingMessage
  | PauseRecordingMessage
  | ResumeRecordingMessage
  | ReleaseRecordingMessage;

interface ActiveRecording {
  tabId: number;
  fileName: string;
  chunks: Blob[];
  recorder: MediaRecorder;
  elapsedMs: number;
  runningStartedAt?: number;
  stream: MediaStream;
}

let activeRecording: ActiveRecording | null = null;
const MAX_RECORDING_MS = 5 * 60 * 1_000;
let maxDurationTimer: number | undefined;

function getRecorderOptions(): MediaRecorderOptions | undefined {
  const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mimeType = mimeTypes.find((value) => MediaRecorder.isTypeSupported(value));
  return mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : { videoBitsPerSecond: 6_000_000 };
}

async function createStream(streamId: string, source: RecordingSource): Promise<MediaStream> {
  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: source === 'window' ? 'desktop' : 'tab',
        chromeMediaSourceId: streamId,
        maxWidth: 1920,
        maxHeight: 1080,
        maxFrameRate: 24,
      },
    },
  } as MediaStreamConstraints;
  return navigator.mediaDevices.getUserMedia(constraints);
}

function clearMaxDurationTimer(): void {
  if (maxDurationTimer !== undefined) {
    window.clearTimeout(maxDurationTimer);
    maxDurationTimer = undefined;
  }
}

function scheduleMaxDurationStop(recording: ActiveRecording): void {
  clearMaxDurationTimer();
  const remainingMs = Math.max(0, MAX_RECORDING_MS - recording.elapsedMs);
  maxDurationTimer = window.setTimeout(stopRecording, remainingMs);
}

function notifyFailure(tabId: number, error: unknown): void {
  const message = error instanceof Error ? error.message : '录制过程中发生未知错误。';
  void chrome.runtime.sendMessage({ type: 'quick-copy/offscreen-recording-failed', tabId, error: message });
}

function stopRecording(): void {
  const recording = activeRecording;
  if (recording && recording.recorder.state !== 'inactive') {
    recording.recorder.stop();
  }
}

async function startRecording(message: StartRecordingMessage): Promise<void> {
  if (activeRecording) {
    throw new Error('录制器已被占用。');
  }

  const stream = await createStream(message.streamId, message.source ?? 'tab');
  const recorder = new MediaRecorder(stream, getRecorderOptions());
  const recording: ActiveRecording = {
    tabId: message.tabId,
    fileName: message.fileName,
    chunks: [],
    recorder,
    elapsedMs: 0,
    runningStartedAt: Date.now(),
    stream,
  };
  activeRecording = recording;

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      recording.chunks.push(event.data);
    }
  });
  recorder.addEventListener('error', () => {
    notifyFailure(recording.tabId, new Error('浏览器录制器异常终止。'));
  });
  recorder.addEventListener('stop', () => {
    clearMaxDurationTimer();
    recording.stream.getTracks().forEach((track) => track.stop());
    activeRecording = null;

    if (recording.chunks.length === 0) {
      notifyFailure(recording.tabId, new Error('未生成有效的录屏内容。'));
      return;
    }

    const blob = new Blob(recording.chunks, { type: recorder.mimeType || 'video/webm' });
    const blobUrl = URL.createObjectURL(blob);
    const recordingId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    void saveRecordingPreview(recordingId, blob)
      .then(() => chrome.runtime.sendMessage({
        type: 'quick-copy/offscreen-recording-stopped',
        tabId: recording.tabId,
        blobUrl,
        fileName: recording.fileName,
        recordingId,
      }))
      .catch(() => chrome.runtime.sendMessage({
        type: 'quick-copy/offscreen-recording-stopped',
        tabId: recording.tabId,
        blobUrl,
        fileName: recording.fileName,
      }));
  });
  stream.getVideoTracks().forEach((track) => {
    track.addEventListener('ended', stopRecording, { once: true });
  });

  recorder.start(1_000);
  scheduleMaxDurationStop(recording);
}

chrome.runtime.onMessage.addListener((message: OffscreenMessage, _sender, sendResponse) => {
  if (message.type === 'quick-copy/offscreen-start-recording') {
    void startRecording(message)
      .then(() => sendResponse({ ok: true }))
      .catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : '开始录制失败。' }));
    return true;
  }

  if (message.type === 'quick-copy/offscreen-stop-recording') {
    if (!activeRecording || activeRecording.tabId !== message.tabId) {
      sendResponse({ ok: false, error: '没有可停止的录制。' });
      return false;
    }
    stopRecording();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'quick-copy/offscreen-pause-recording') {
    if (!activeRecording || activeRecording.tabId !== message.tabId || activeRecording.recorder.state !== 'recording') {
      sendResponse({ ok: false, error: '没有可暂停的录制。' });
      return false;
    }
    activeRecording.elapsedMs += Date.now() - (activeRecording.runningStartedAt ?? Date.now());
    activeRecording.runningStartedAt = undefined;
    clearMaxDurationTimer();
    activeRecording.recorder.pause();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'quick-copy/offscreen-resume-recording') {
    if (!activeRecording || activeRecording.tabId !== message.tabId || activeRecording.recorder.state !== 'paused') {
      sendResponse({ ok: false, error: '没有可继续的录制。' });
      return false;
    }
    activeRecording.runningStartedAt = Date.now();
    activeRecording.recorder.resume();
    scheduleMaxDurationStop(activeRecording);
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'quick-copy/offscreen-release-recording') {
    URL.revokeObjectURL(message.blobUrl);
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
