import type { JsonValue, NetworkRequestRecord } from './types';

interface ParsedResponseErrorRule {
  path: string[];
  operator: '===' | '!==' | '==' | '!=' | '>=' | '<=' | '>' | '<';
  expected: JsonValue;
}

function isJsonObject(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseRuleLiteral(rawLiteral: string): JsonValue | undefined {
  const trimmedLiteral = rawLiteral.trim();

  if (!trimmedLiteral) {
    return undefined;
  }

  const shouldParseJson =
    trimmedLiteral === 'true' ||
    trimmedLiteral === 'false' ||
    trimmedLiteral === 'null' ||
    /^-?\d+(?:\.\d+)?$/.test(trimmedLiteral) ||
    (trimmedLiteral.startsWith('"') && trimmedLiteral.endsWith('"')) ||
    (trimmedLiteral.startsWith('[') && trimmedLiteral.endsWith(']')) ||
    (trimmedLiteral.startsWith('{') && trimmedLiteral.endsWith('}'));

  if (shouldParseJson) {
    try {
      return JSON.parse(trimmedLiteral) as JsonValue;
    } catch {
      return undefined;
    }
  }

  if (trimmedLiteral.startsWith("'") && trimmedLiteral.endsWith("'")) {
    return trimmedLiteral.slice(1, -1);
  }

  return undefined;
}

function parseResponseErrorRule(rule: string): ParsedResponseErrorRule | undefined {
  const normalizedRule = rule.trim();
  if (!normalizedRule) {
    return undefined;
  }

  const matchedRule = normalizedRule.match(
    /^res((?:\.[A-Za-z_$][\w$]*)+)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/,
  );

  if (!matchedRule) {
    return undefined;
  }

  const expected = parseRuleLiteral(matchedRule[3]);
  if (expected === undefined) {
    return undefined;
  }

  return {
    path: matchedRule[1].split('.').filter(Boolean),
    operator: matchedRule[2] as ParsedResponseErrorRule['operator'],
    expected,
  };
}

function getResponseRuleActualValue(
  response: JsonValue | undefined,
  path: string[],
): JsonValue | undefined {
  let currentValue = response;

  for (const segment of path) {
    if (!isJsonObject(currentValue) || !(segment in currentValue)) {
      return undefined;
    }

    currentValue = currentValue[segment];
  }

  return currentValue;
}

function getResponseScalarString(
  response: JsonValue | undefined,
  path: string[],
): string | undefined {
  const value = getResponseRuleActualValue(response, path);

  if (typeof value === 'string') {
    return value.trim() || undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

function compareRuleValues(
  actual: JsonValue | undefined,
  expected: JsonValue,
  operator: ParsedResponseErrorRule['operator'],
): boolean {
  switch (operator) {
    case '===':
      return actual === expected;
    case '!==':
      return actual !== expected;
    case '==':
      // eslint-disable-next-line eqeqeq
      return actual == expected;
    case '!=':
      // eslint-disable-next-line eqeqeq
      return actual != expected;
    case '>=':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case '<=':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case '>':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case '<':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    default:
      return false;
  }
}

export function evaluateResponseErrorRule(
  response: JsonValue | undefined,
  rule: string,
): boolean {
  const parsedRule = parseResponseErrorRule(rule);
  if (!parsedRule) {
    return false;
  }

  const actualValue = getResponseRuleActualValue(response, parsedRule.path);
  if (actualValue === undefined) {
    return false;
  }

  return compareRuleValues(actualValue, parsedRule.expected, parsedRule.operator);
}

export function getResponseMessage(response: JsonValue | undefined): string | undefined {
  const messageValue = getResponseRuleActualValue(response, ['msg']);

  if (typeof messageValue === 'string') {
    return messageValue.trim() || undefined;
  }

  if (typeof messageValue === 'number' || typeof messageValue === 'boolean') {
    return String(messageValue);
  }

  if (messageValue && typeof messageValue === 'object') {
    try {
      const serializedMessage = JSON.stringify(messageValue);
      return serializedMessage || undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function sanitizeResponseSnapshot(
  value: unknown,
  depth = 0,
): JsonValue | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return typeof value === 'string' && value.length > 300 ? `${value.slice(0, 300)}...` : value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (depth >= 3) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 10)
      .map((item) => sanitizeResponseSnapshot(item, depth + 1))
      .filter((item): item is JsonValue => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 20)
      .map(([key, item]) => [key, sanitizeResponseSnapshot(item, depth + 1)] as const)
      .filter((entry): entry is [string, JsonValue] => entry[1] !== undefined);

    return Object.fromEntries(entries);
  }

  return undefined;
}

export function getRequestAbnormalReasons(
  request: Pick<NetworkRequestRecord, 'statusCode' | 'error' | 'responseSnapshot'>,
  responseErrorRule: string,
): string[] {
  const reasons: string[] = [];
  const ruleMatched = evaluateResponseErrorRule(request.responseSnapshot, responseErrorRule);

  if (request.error) {
    reasons.push(request.error);
  }

  if (typeof request.statusCode === 'number' && request.statusCode !== 200) {
    reasons.push(`HTTP ${request.statusCode}`);
  }

  if (request.statusCode === 200 && ruleMatched) {
    reasons.push(`命中响应规则：${responseErrorRule}`);
  }

  return reasons;
}

export function withRequestAbnormalState(
  request: NetworkRequestRecord,
  responseErrorRule: string,
): NetworkRequestRecord {
  const abnormalReasons = getRequestAbnormalReasons(request, responseErrorRule);
  const responseMessage = getResponseMessage(request.responseSnapshot);

  return {
    ...request,
    responseRuleMatched: abnormalReasons.some((reason) => reason.startsWith('命中响应规则：')),
    responseMessage,
    abnormalReasons: abnormalReasons.length > 0 ? abnormalReasons : undefined,
  };
}

export function getResponseRtnValue(response: JsonValue | undefined): string | undefined {
  return getResponseScalarString(response, ['rtn']);
}
