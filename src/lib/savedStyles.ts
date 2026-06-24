// Named styles saved in localStorage (separate from the single autosave).

export interface SavedStyle {
  name: string;
  text: string;
  savedAt: number;
}

const KEY = "map-style-editor:saved";

export function listSaved(): SavedStyle[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as SavedStyle[]) : [];
    return arr.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function write(arr: SavedStyle[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    // quota / private mode — ignore
  }
}

/** Save (or overwrite by name). `now` is passed in since Date.now() is fine in the app. */
export function saveStyleNamed(name: string, text: string, now: number): void {
  const arr = listSaved().filter((s) => s.name !== name);
  arr.push({ name, text, savedAt: now });
  write(arr);
}

export function deleteSaved(name: string): void {
  write(listSaved().filter((s) => s.name !== name));
}
