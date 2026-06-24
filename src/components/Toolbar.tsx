import { useRef, useState } from "react";
import { downloadStyle, fetchStyleText, readFileText } from "../lib/styleLoader";
import { DEFAULT_STYLE_URL } from "../lib/defaultStyle";
import { TEMPLATES, templatesByGroup } from "../lib/templates";
import Logo from "./Logo";

interface ToolbarProps {
  /** Replace the editor content (e.g. after loading from URL / file). */
  onLoad: (text: string) => void;
  /** Current editor text, for export. */
  currentText: string;
  /** Reset to the default style and clear persistence. */
  onReset: () => void;
}

export default function Toolbar({ onLoad, currentText, onReset }: ToolbarProps) {
  const [url, setUrl] = useState(DEFAULT_STYLE_URL);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleLoadUrl() {
    setBusy(true);
    try {
      onLoad(await fetchStyleText(url));
    } catch (e) {
      alert(
        `Failed to load the URL.\n${e instanceof Error ? e.message : e}\n\n` +
          "Common cause: the style/tile server does not allow CORS.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleTemplate(e: React.ChangeEvent<HTMLSelectElement>) {
    const tpl = TEMPLATES.find((t) => t.id === e.target.value);
    e.target.value = "";
    if (!tpl) return;
    if (tpl.inline) {
      onLoad(JSON.stringify(tpl.inline, null, 2));
      return;
    }
    setBusy(true);
    try {
      onLoad(await fetchStyleText(tpl.url!));
    } catch (err) {
      alert(`Failed to load the template.\n${err instanceof Error ? err.message : err}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onLoad(await readFileText(file));
    } catch (err) {
      alert(`Failed to read the file.\n${err instanceof Error ? err.message : err}`);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar__brand">
        <Logo size={20} />
        <span>Map Style Editor</span>
      </div>

      <select className="select" style={{ width: "auto" }} value="" onChange={handleTemplate} title="Load a preset style">
        <option value="">Templates…</option>
        {templatesByGroup().map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div className="url-field">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="MapLibre style URL…"
          onKeyDown={(e) => e.key === "Enter" && handleLoadUrl()}
        />
        <button onClick={handleLoadUrl} disabled={busy}>
          {busy ? "Loading…" : "Load"}
        </button>
      </div>

      <div className="toolbar__spacer" />

      <button className="btn" onClick={() => fileRef.current?.click()}>
        Import…
      </button>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} style={{ display: "none" }} />
      <button className="btn btn--primary" onClick={() => downloadStyle(currentText)}>
        Export
      </button>
      <button className="btn" onClick={onReset} title="Back to the default style">
        Reset
      </button>
    </div>
  );
}
