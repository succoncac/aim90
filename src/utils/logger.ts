export interface ApiLog {
  id: string;
  time: string;
  timestamp: number;
  type: 'scan' | 'chat';
  provider: string;
  format: string;
  endpoint: string;
  status: 'ok' | 'err';
  httpCode?: number | string;
  logText: string;
  hint?: string;
}

const MAX_LOGS = 50;
let logListeners: Array<(logs: ApiLog[]) => void> = [];
let logsStore: ApiLog[] = [];

export function addApiLog(entry: Omit<ApiLog, 'id' | 'time' | 'timestamp'>): ApiLog {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const newLog: ApiLog = {
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: timeStr,
    timestamp: Date.now(),
  };

  logsStore = [newLog, ...logsStore].slice(0, MAX_LOGS);
  logListeners.forEach((listener) => listener([...logsStore]));
  return newLog;
}

export function getApiLogs(): ApiLog[] {
  return [...logsStore];
}

export function clearApiLogs(): void {
  logsStore = [];
  logListeners.forEach((listener) => listener([]));
}

export function subscribeApiLogs(listener: (logs: ApiLog[]) => void): () => void {
  logListeners.push(listener);
  listener([...logsStore]);
  return () => {
    logListeners = logListeners.filter((l) => l !== listener);
  };
}
