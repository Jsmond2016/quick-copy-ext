import type { JsonValue, NetworkRequestRecord } from './types';

interface ParsedResponseErrorRule {
  path: string[];
  operator: '===' | '!==' | '==' | '!=' | '>=' | '<=' | '>' | '<';
  expected: JsonValue;
}

interface ParsedResponseErrorRuleGroup {
  conditions: ParsedResponseErrorRule[];
}

export interface ResponseErrorRuleEntry {
  label: string;
  expression: string;
}

function isJsonValue(value: unknown): value is JsonValue {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value) || Array.isArray(value) || typeof value === 'object';
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

function parseResponseErrorRuleCondition(rule: string): ParsedResponseErrorRule | undefined {
  const normalizedRule = rule.trim();
  if (!normalizedRule) {
    return undefined;
  }

  const matchedRule = normalizedRule.match(
    /^res((?:(?:\??\.)[A-Za-z_$][\w$]*)+)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/,
  );

  if (!matchedRule) {
    return undefined;
  }

  const expected = parseRuleLiteral(matchedRule[3]);
  if (expected === undefined) {
    return undefined;
  }

  return {
    path: matchedRule[1].replace(/\?\./g, '.').split('.').filter(Boolean),
    operator: matchedRule[2] as ParsedResponseErrorRule['operator'],
    expected,
  };
}

function parseResponseErrorRule(rule: string): ParsedResponseErrorRuleGroup | undefined {
  const normalizedRule = rule.trim();

  if (!normalizedRule) {
    return undefined;
  }

  const conditions = normalizedRule
    .split('&&')
    .map((condition) => parseResponseErrorRuleCondition(condition))
    .filter((condition): condition is ParsedResponseErrorRule => Boolean(condition));

  if (conditions.length === 0) {
    return undefined;
  }

  const rawConditions = normalizedRule
    .split('&&')
    .map((condition) => condition.trim())
    .filter(Boolean);

  if (conditions.length !== rawConditions.length) {
    return undefined;
  }

  return { conditions };
}

function getResponseRuleActualValue(
  response: JsonValue | undefined,
  path: string[],
): JsonValue | undefined {
  let currentValue: unknown = response;

  for (const segment of path) {
    if (currentValue === null || currentValue === undefined) {
      return undefined;
    }

    if ((Array.isArray(currentValue) || typeof currentValue === 'string') && segment === 'length') {
      currentValue = currentValue.length;
      continue;
    }

    if (typeof currentValue !== 'object' || !(segment in currentValue)) {
      return undefined;
    }

    currentValue = (currentValue as Record<string, unknown>)[segment];
  }

  return isJsonValue(currentValue) ? currentValue : undefined;
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
      return actual == expected;
    case '!=':
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

  return parsedRule.conditions.every((condition) => {
    const actualValue = getResponseRuleActualValue(response, condition.path);
    if (
      actualValue === undefined &&
      !(
        (condition.operator === '==' || condition.operator === '!=') &&
        condition.expected === null
      )
    ) {
      return false;
    }

    return compareRuleValues(actualValue, condition.expected, condition.operator);
  });
}

export function parseResponseErrorRuleConfig(
  ruleConfig: string,
): ResponseErrorRuleEntry[] | undefined {
  const normalizedConfig = ruleConfig.trim();

  if (!normalizedConfig) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(normalizedConfig) as unknown;

    if (!Array.isArray(parsed)) {
      return undefined;
    }

    const entries: ResponseErrorRuleEntry[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== 'object') {
        return undefined;
      }

      const { label, expression } = item as Record<string, unknown>;

      if (
        typeof label !== 'string' ||
        !label.trim() ||
        typeof expression !== 'string' ||
        !expression.trim()
      ) {
        return undefined;
      }

      entries.push({
        label: label.trim(),
        expression: expression.trim(),
      });
    }

    return entries.length > 0 ? entries : undefined;
  } catch {
    return undefined;
  }
}

export function getMatchedResponseErrorRules(
  response: JsonValue | undefined,
  ruleConfig: string,
): ResponseErrorRuleEntry[] {
  const ruleEntries = parseResponseErrorRuleConfig(ruleConfig);

  if (!ruleEntries) {
    return [];
  }

  const matchedRules: ResponseErrorRuleEntry[] = [];

  for (const entry of ruleEntries) {
    if (!evaluateResponseErrorRule(response, entry.expression)) {
      continue;
    }

    matchedRules.push(entry);
    break;
  }

  return matchedRules;
}

export function isValidResponseErrorRuleConfig(ruleConfig: string): boolean {
  const ruleEntries = parseResponseErrorRuleConfig(ruleConfig);

  return Boolean(
    ruleEntries &&
      ruleEntries.length > 0 &&
      ruleEntries.every(
        (entry) =>
          typeof entry.label === 'string' &&
          entry.label.trim().length > 0 &&
          typeof entry.expression === 'string' &&
          entry.expression.trim().length > 0 &&
          Boolean(parseResponseErrorRule(entry.expression)),
      ),
  );
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
    const sanitizedItems = value
      .slice(0, 10)
      .map((item) => sanitizeResponseSnapshot(item, depth + 1))
      .filter((item): item is JsonValue => item !== undefined);

    if (sanitizedItems.length > 0) {
      return sanitizedItems;
    }

    return value.length > 0 ? [null] : [];
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
  const matchedRules = getMatchedResponseErrorRules(request.responseSnapshot, responseErrorRule);

  if (request.error) {
    reasons.push(request.error);
  }

  if (typeof request.statusCode === 'number' && request.statusCode !== 200) {
    reasons.push(`HTTP ${request.statusCode}`);
  }

  if (request.statusCode === 200) {
    matchedRules.forEach((matchedRule) => {
      reasons.push(`命中响应规则：${matchedRule.label}（${matchedRule.expression}）`);
    });
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
