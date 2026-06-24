/** Fetch a style document from a URL and return its raw, pretty-printed text. */
export async function fetchStyleText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  // Re-format if it parses as JSON; otherwise return as-is and let the editor flag it.
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** Read an uploaded File as text. */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("File read error"));
    reader.readAsText(file);
  });
}

/** Trigger a browser download of the given text as a .json file. */
export function downloadStyle(text: string, filename = "style.json"): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke later — revoking synchronously can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
