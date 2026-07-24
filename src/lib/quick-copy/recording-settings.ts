export const RECORDING_SETTINGS_STORAGE_KEY = 'quick-copy-recording-settings';
export const DEFAULT_RECORDING_DOWNLOAD_DIRECTORY = 'quick-copy-ext';

export interface RecordingSettings {
  downloadDirectory: string;
}

function normalizeDirectory(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_RECORDING_DOWNLOAD_DIRECTORY;
  }

  const segments = value
    .replaceAll('\\', '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .map((segment) => segment.replace(/[<>:"|?*\u0000-\u001F]/g, ''))
    .filter(Boolean);

  return segments.join('/') || DEFAULT_RECORDING_DOWNLOAD_DIRECTORY;
}

export function normalizeRecordingSettings(value?: Partial<RecordingSettings>): RecordingSettings {
  return {
    downloadDirectory: normalizeDirectory(value?.downloadDirectory),
  };
}

export async function loadRecordingSettings(): Promise<RecordingSettings> {
  const stored = await chrome.storage.sync.get(RECORDING_SETTINGS_STORAGE_KEY);
  return normalizeRecordingSettings(stored[RECORDING_SETTINGS_STORAGE_KEY] as Partial<RecordingSettings> | undefined);
}

export async function saveRecordingSettings(settings: RecordingSettings): Promise<RecordingSettings> {
  const normalized = normalizeRecordingSettings(settings);
  await chrome.storage.sync.set({ [RECORDING_SETTINGS_STORAGE_KEY]: normalized });
  return normalized;
}

export function buildRecordingDownloadFileName(directory: string, fileName: string): string {
  return `${normalizeDirectory(directory)}/${fileName}`;
}
