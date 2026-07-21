export function toIsoTimestamp(value: string): string {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    throw new TypeError(`Ungültiger Zeitstempel: ${value}`);
  }

  return timestamp.toISOString();
}
