import { ContentType, Item } from '@schemas/content';
import { fixItem } from './item-cleaning';

export type CleaningLogType = 'thought' | 'tool' | 'error' | 'done' | 'info';
export type CleaningStatus = 'running' | 'done' | 'error';

export type CleaningLog = {
  type: CleaningLogType;
  message: string;
  /** Expandable input JSON for tool calls */
  detail?: string;
  /** Plain text result for non-fetch tool calls */
  resultText?: string;
  /** Populated when tool was fetchContent — records to render as drawer buttons */
  contentResults?: { contentType: string; records: { id: number; name: string }[] };
  timestamp: string;
};

/**
 * Cleans the given content based on its type and logs the cleaning process.
 */
export async function cleanContent(cleaningRecordId: string, type: ContentType, content: Record<string, any>) {
  localStorage.setItem(`cleaning-log-${cleaningRecordId}`, JSON.stringify([]));
  localStorage.setItem(`cleaning-status-${cleaningRecordId}`, 'running' satisfies CleaningStatus);

  try {
    let fixedContent: Record<string, any> | null = null;
    if (type === 'item') {
      fixedContent = await fixItem(content as Item, (logType, data) => addCleaningLog(cleaningRecordId, logType, data));
    }

    addCleaningLog(cleaningRecordId, 'done', 'Cleaned successfully');

    localStorage.setItem(`cleaning-status-${cleaningRecordId}`, 'done' satisfies CleaningStatus);
    localStorage.setItem(`cleaning-result-${cleaningRecordId}`, JSON.stringify({ type, content: fixedContent }));
  } catch (e: any) {
    addCleaningLog(cleaningRecordId, 'error', e?.message ?? 'An unknown error occurred');
    localStorage.setItem(`cleaning-status-${cleaningRecordId}`, 'error' satisfies CleaningStatus);
  }
}

/**
 * Adds a structured log entry for a cleaning session.
 */
export function addCleaningLog(cleaningRecordId: string, logType: string, data: any) {
  const logs = getCleaningLogs(cleaningRecordId);

  let message: string;
  let detail: string | undefined;
  let resultText: string | undefined;
  let contentResults: CleaningLog['contentResults'];

  if (typeof data === 'string') {
    message = data;
  } else if (data?.name && typeof data.name === 'string') {
    // Combined tool+result entry: { name, input, records?, contentType?, resultText? }
    if (data.name === 'fetchContent' && data.input) {
      const { type: cType, ...rest } = data.input as Record<string, any>;
      const params = Object.entries(rest)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(', ');
      const count = data.records?.length ?? 0;
      message = `fetchContent(${cType}${params ? ', ' + params : ''}) → ${count} result${count !== 1 ? 's' : ''}`;
      if (data.records !== undefined) {
        contentResults = { contentType: data.contentType, records: data.records };
      }
    } else {
      message = data.name;
      resultText = data.resultText;
    }
    detail = data.input !== undefined ? JSON.stringify(data.input, null, 2) : undefined;
  } else {
    message = JSON.stringify(data);
  }

  const entry: CleaningLog = {
    type: logType as CleaningLogType,
    message,
    detail,
    resultText,
    contentResults,
    timestamp: new Date().toISOString(),
  };

  logs.push(entry);
  localStorage.setItem(`cleaning-log-${cleaningRecordId}`, JSON.stringify(logs));
}

/**
 * Retrieves structured cleaning logs for a given record ID.
 */
export function getCleaningLogs(cleaningRecordId: string): CleaningLog[] {
  return JSON.parse(localStorage.getItem(`cleaning-log-${cleaningRecordId}`) || '[]');
}

/**
 * Returns the current status of a cleaning session.
 */
export function getCleaningStatus(cleaningRecordId: string): CleaningStatus {
  return (localStorage.getItem(`cleaning-status-${cleaningRecordId}`) as CleaningStatus | null) ?? 'running';
}

/**
 * Retrieves the cleaning result for a given record ID, if available.
 */
export function getCleaningResult(cleaningRecordId: string): { type: ContentType; content: any } | null {
  const raw = localStorage.getItem(`cleaning-result-${cleaningRecordId}`);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Clears all cleaning data for a single session (log, status, result, input).
 */
export function clearCleaningSession(cleaningRecordId: string) {
  localStorage.removeItem(`cleaning-log-${cleaningRecordId}`);
  localStorage.removeItem(`cleaning-status-${cleaningRecordId}`);
  localStorage.removeItem(`cleaning-result-${cleaningRecordId}`);
  localStorage.removeItem(`cleaning-input-${cleaningRecordId}`);
}

/**
 * Clears all cleaning data (logs, status, results, inputs) from local storage.
 */
export function clearCleaningLogs() {
  const prefixes = ['cleaning-log-', 'cleaning-status-', 'cleaning-result-', 'cleaning-input-'];
  Object.keys(localStorage)
    .filter((key) => prefixes.some((p) => key.startsWith(p)))
    .forEach((key) => localStorage.removeItem(key));
}

/**
 * Opens the content cleaning page for a specific cleaning record.
 */
export function openCleaningPage(cleaningRecordId: string, type: ContentType, content: Record<string, any>) {
  localStorage.setItem(`cleaning-input-${cleaningRecordId}`, JSON.stringify({ type, content }));
  window.open(`/content-cleaning/${cleaningRecordId}`, '_blank');
}

/**
 * Fetches the cleaning input for a given record ID from local storage.
 */
export function fetchCleaningInput(cleaningRecordId: string) {
  const input = localStorage.getItem(`cleaning-input-${cleaningRecordId}`);
  if (!input) return null;
  return JSON.parse(input) as { type: ContentType; content: Record<string, any> };
}
