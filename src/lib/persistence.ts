const STORAGE_KEY = "map-style-editor:style";

/** Persist the current editor text so a refresh keeps the work in progress. */
export function saveStyle(text: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, text);
  } catch {
    // Quota / private mode — non-fatal, editing still works in-memory.
  }
}

export function loadSavedStyle(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearSavedStyle(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
