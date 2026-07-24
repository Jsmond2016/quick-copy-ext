import { useCallback, useEffect, useState } from 'react';
import type { RecordingSession } from '@src/lib/quick-copy';
import {
  getErrorMessage,
  getRecordingSession,
  isTabRecordingSupported,
  startTabRecording,
  stopTabRecording,
  pauseTabRecording,
  resumeTabRecording,
  subscribeToRecordingUpdates,
} from '@pages/popup/services/runtime';

const IDLE_SESSION: RecordingSession = { status: 'idle' };

interface UseRecordingResult {
  isSupported: boolean;
  pending: boolean;
  session: RecordingSession;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}

export function useRecording(
  tabId: number | null,
  onError: (message: string) => void,
  onSaved: (fileName: string) => void,
): UseRecordingResult {
  const [session, setSession] = useState<RecordingSession>(IDLE_SESSION);
  const [pending, setPending] = useState(false);
  const isSupported = isTabRecordingSupported();

  const refresh = useCallback(async () => {
    if (!isSupported || tabId === null) {
      setSession(IDLE_SESSION);
      return;
    }

    try {
      const nextSession = await getRecordingSession(tabId);
      setSession(nextSession);
      if (nextSession.status === 'saved' && nextSession.savedFileName) {
        onSaved(nextSession.savedFileName);
      }
    } catch (error) {
      onError(getErrorMessage(error, '读取录制状态失败。'));
    }
  }, [isSupported, onError, onSaved, tabId]);

  useEffect(() => {
    void refresh();
    return subscribeToRecordingUpdates((updatedTabId) => {
      if (updatedTabId === tabId) {
        void refresh();
      }
    });
  }, [refresh, tabId]);

  const start = useCallback(async () => {
    if (tabId === null) {
      onError('未获取到当前标签页，无法开始录制。');
      return;
    }

    setPending(true);
    try {
      setSession(await startTabRecording(tabId));
    } catch (error) {
      onError(getErrorMessage(error, '开始录制失败。'));
    } finally {
      setPending(false);
    }
  }, [onError, tabId]);

  const stop = useCallback(async () => {
    if (tabId === null) {
      return;
    }

    setPending(true);
    try {
      setSession(await stopTabRecording(tabId));
    } catch (error) {
      onError(getErrorMessage(error, '停止录制失败。'));
    } finally {
      setPending(false);
    }
  }, [onError, tabId]);

  const pause = useCallback(async () => {
    if (tabId === null) return;
    setPending(true);
    try {
      setSession(await pauseTabRecording(tabId));
    } catch (error) {
      onError(getErrorMessage(error, '暂停录制失败。'));
    } finally {
      setPending(false);
    }
  }, [onError, tabId]);

  const resume = useCallback(async () => {
    if (tabId === null) return;
    setPending(true);
    try {
      setSession(await resumeTabRecording(tabId));
    } catch (error) {
      onError(getErrorMessage(error, '继续录制失败。'));
    } finally {
      setPending(false);
    }
  }, [onError, tabId]);

  return { isSupported, pending, session, start, pause, resume, stop };
}
