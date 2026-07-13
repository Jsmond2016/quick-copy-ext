import type { QuickCopySettings } from '@src/lib/quick-copy';

type ApifoxSettings = Pick<QuickCopySettings, 'apifoxExportUrl' | 'apifoxAuthToken'>;

export function hasApifoxConfigChanged(
  current: ApifoxSettings,
  next: ApifoxSettings,
): boolean {
  return current.apifoxExportUrl !== next.apifoxExportUrl
    || current.apifoxAuthToken !== next.apifoxAuthToken;
}

export function getSettingsSavedMessage(
  apifoxExportUrl: string,
  apifoxConfigChanged: boolean,
): string {
  if (!apifoxConfigChanged) {
    return apifoxExportUrl
      ? '配置已保存，Apifox 配置未变化，已保留现有缓存。'
      : '配置已保存，监听范围已更新。';
  }

  return apifoxExportUrl
    ? '配置已保存，Apifox 接口信息正在后台刷新。'
    : '配置已保存，监听范围已更新，且已清空 Apifox 缓存。';
}
