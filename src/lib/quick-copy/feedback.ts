import { formatDuration, formatTime, getTraceId, getUrlAfterOrigin } from './url';
import { getResponseMessage, getResponseRtnValue } from './response-rules';
import type { CopyPayload, JsonValue, NetworkRequestRecord, PageSummary } from './types';

function getUrlPathname(url: string | undefined): string {
  if (!url) return '-';

  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return '-';
  }
}

function getJsonObjectValue(
  value: JsonValue | undefined,
  path: string[],
): JsonValue | undefined {
  let currentValue: unknown = value;

  for (const segment of path) {
    if (!currentValue || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
      return undefined;
    }

    currentValue = (currentValue as Record<string, unknown>)[segment];
  }

  return currentValue as JsonValue | undefined;
}

function stringifyInlineValue(value: JsonValue): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  }

  return JSON.stringify(value);
}

function buildMatchedRuleSnapshot(request: NetworkRequestRecord): string | undefined {
  const responseSnapshot = request.responseSnapshot;
  const responseRtn = getResponseRtnValue(responseSnapshot);
  const responseMessage = request.responseMessage ?? getResponseMessage(responseSnapshot);
  const responseList = getJsonObjectValue(responseSnapshot, ['data', 'list']);
  const responsePagination = getJsonObjectValue(responseSnapshot, ['data', 'pagination']);
  const fields: string[] = [];

  if (responseRtn !== undefined) {
    fields.push(`rtn: ${responseRtn}`);
  }

  if (responseList !== undefined) {
    fields.push(`list: ${stringifyInlineValue(responseList)}`);
  }

  if (responsePagination !== undefined) {
    fields.push(`pagination: ${stringifyInlineValue(responsePagination)}`);
  }

  if (responseMessage) {
    fields.push(`msg: "${responseMessage}"`);
  }

  return fields.length > 0 ? `{${fields.join(', ')} }` : undefined;
}

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

  if (matchedResponseRule) {
    const matchedRuleSnapshot = buildMatchedRuleSnapshot(request);

    if (matchedRuleSnapshot) {
      return matchedRuleSnapshot;
    }
  }

  return abnormalReasons[0] ?? '-';
}

export function buildWebOnlyText(payload: {
  page: PageSummary;
  feedbackTitle: string;
  note: string;
  customFields: string[];
  selectedEnvironment?: {
    name: string;
    url: string;
  };
}): string {
  const normalizedTitle = payload.feedbackTitle.trim() || '页面接口信息如下';
  const normalizedNote = payload.note.trim() || '-';
  const sections: string[] = [
    `- 问题：${normalizedNote}`,
    `- 截图：-`,
    '',
    `=== ${normalizedTitle}`,
    '',
    'Web 信息：',
    '',
    `- 页面 URL：${payload.page.url || '-'}`,
    `- 页面标题：${payload.page.title || '-'}`,
  ];

  if (payload.selectedEnvironment) {
    if (payload.selectedEnvironment.url) {
      sections.push(`- 环境${payload.selectedEnvironment.name}：${payload.selectedEnvironment.url}`);
    } else {
      sections.push(`- 环境：${payload.selectedEnvironment.name}`);
    }
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

export function buildFeedbackText(payload: CopyPayload): string {
  const normalizedTitle = payload.feedbackTitle.trim() || '页面接口信息如下';
  const normalizedNote = payload.note.trim() || '-';
  const normalizedScreenshotLabel = payload.screenshotLabel.trim() || '-';
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
    `- 页面 URL：${payload.page.url || '-'}`,
    `- 页面标题：${payload.page.title || '-'}`,
  ];

  if (payload.selectedEnvironment) {
    if (payload.selectedEnvironment.url) {
      sections.push(`- 环境${payload.selectedEnvironment.name}：${payload.selectedEnvironment.url}`);
    } else {
      sections.push(`- 环境：${payload.selectedEnvironment.name}`);
    }
  }

  sections.push('');
  sections.push(`${abnormalRequestsTitle}：`);
  sections.push('');

  if (payload.requests.length === 0) {
    sections.push('- 未选择异常接口');
  } else {
    payload.requests.forEach((request, index) => {
      if (request.apiName) {
        sections.push(`- 接口名: ${request.apiName}`);
      }

      sections.push(`- ${request.method.toUpperCase()} ${getUrlAfterOrigin(request.url)}`);
      sections.push(`- traceId: ${getTraceId(request.headers)}`);
      sections.push(`- 状态码: ${request.statusCode ?? '-'}`);

      if (request.abnormalReasons && request.abnormalReasons.length > 0) {
        sections.push(`- 异常原因: ${formatAbnormalReasonForCopy(request)}`);
      }

      sections.push(`- 请求时间: ${formatTime(request.startedAt)}`);
      sections.push(`- 耗时: ${formatDuration(request.startedAt, request.completedAt)}`);
      sections.push(`- apifox: ${request.apifoxUrl ?? '-'}`);

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
