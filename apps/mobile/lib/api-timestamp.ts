/** PostgreSQL-Zeitstempel ebenfalls in das von Hermes verstandene ISO-Format bringen. */
export function normalizeApiTimestamp(value: string): string {
  return value.trim()
    .replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00");
}

export function parseApiTimestamp(value: string): Date | null {
  const date = new Date(normalizeApiTimestamp(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
