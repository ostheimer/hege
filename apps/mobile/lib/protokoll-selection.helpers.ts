export function resolveSelectedProtokollId(
  entries: ReadonlyArray<{ id: string }>,
  selectedId: string | null
): string | null {
  if (entries.length === 0) {
    return null;
  }

  if (selectedId && entries.some((entry) => entry.id === selectedId)) {
    return selectedId;
  }

  return entries[0]?.id ?? null;
}
