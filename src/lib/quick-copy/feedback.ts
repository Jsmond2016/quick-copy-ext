import { formatDuration, formatTime, getTraceId, getUrlAfterOrigin } from './url';
import { getResponseMessage, getResponseRtnValue } from './response-rules';
import type { CopyPayload, NetworkRequestRecord } from './types';

function formatAbnormalReasonForCopy(request: NetworkRequestRecord): string {
  const abnormalReasons = request.abnormalReasons ?? [];
  const responseMessage = request.responseMessage ?? getResponseMessage(request.responseSnapshot);
  const responseRtn = getResponseRtnValue(request.responseSnapshot);
  const matchedResponseRule =
    request.responseRuleMatched ||
    abnormalReasons.some((reason) => reason.startsWith('命中响应规则：'));

  if (typeof request.statusCode === 'number' && request.statusCode !== 200) {
    return `status 状态为 {${request.statusCode}}`;
  }

  if (matchedResponseRule && responseRtn && responseMessage) {
    return `{rtn: ${responseRtn}, msg: "${responseMessage}" }`;
  }

  if (matchedResponseRule && responseRtn) {
    return `{rtn: ${responseRtn}}`;
  }

  if (matchedResponseRule && responseMessage) {
    return `{msg: "${responseMessage}" }`;
  }

  return abnormalReasons[0] ?? 'N/A';
}

export function buildFeedbackText(payload: CopyPayload): string {
  const normalizedTitle = payload.feedbackTitle.trim() || '页面接口信息如下';
  const normalizedNote = payload.note.trim() || 'N/A';
  const normalizedScreenshotLabel = payload.screenshotLabel.trim() || 'N/A';
  const abnormalRequestsTitle =
    payload.requests.length > 1 ? `接口信息-${payload.requests.length}条接口` : '接口信息';
  const sections: string[] = [
    `- 问题：${normalizedNote}`,
    `- 截图：${normalizedScreenshotLabel}`,
    '',
    `=== ${normalizedTitle}`,
    '',
    'Web 信息：',
    '',
    `- 页面 URL：${payload.page.url || 'N/A'}`,
    `- 页面标题：${payload.page.title || 'N/A'}`,
    '',
    `${abnormalRequestsTitle}：`,
    '',
  ];

  if (payload.requests.length === 0) {
    sections.push('- 未选择异常接口');
  } else {
    payload.requests.forEach((request, index) => {
      if (request.apiName) {
        sections.push(`- 接口名: ${request.apiName}`);
      }

      sections.push(`- ${request.method.toUpperCase()} ${getUrlAfterOrigin(request.url)}`);
      sections.push(`- traceId: ${getTraceId(request.headers)}`);
      sections.push(`- 状态码: ${request.statusCode ?? 'N/A'}`);

      if (request.abnormalReasons && request.abnormalReasons.length > 0) {
        sections.push(`- 异常原因: ${formatAbnormalReasonForCopy(request)}`);
      }

      sections.push(`- 请求时间: ${formatTime(request.startedAt)}`);
      sections.push(`- 耗时: ${formatDuration(request.startedAt, request.completedAt)}`);
      sections.push(`- apifox: ${request.apifoxUrl ?? 'N/A'}`);

      if (payload.includeRequestParams && request.requestParams) {
        sections.push('- 接口入参:');
        const formatted = JSON.stringify(request.requestParams, null, 2);
        formatted.split('\n').forEach((line) => {
          sections.push(`  ${line}`);
        });
      }

      if (index < payload.requests.length - 1) {
        sections.push('');
      }
    });
  }

  sections.push('');

  if (payload.customFields.length !== 0) {
    sections.push('---');
    sections.push('');
    payload.customFields.forEach((field) => {
      sections.push(`- ${field}`);
    });
  }

  sections.push('');
  sections.push('=== From Quick Copy Ext');

  return sections.join('\n');
}
