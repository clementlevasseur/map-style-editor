import { useRef, useState } from "react";
import { downloadStyle, fetchStyleText, readFileText } from "../lib/styleLoader";
import { DEFAULT_STYLE_URL } from "../lib/defaultStyle";
import { TEMPLATES, templatesByGroup } from "../lib/templates";
import { getImages } from "../lib/styleImages";
import { buildSprite, downloadBlob } from "../lib/sprite";
import { createZip } from "../lib/zip";
import { buildShareUrl } from "../lib/share";
import Logo from "./Logo";
import SavedMenu from "./SavedMenu";
import SnippetMenu from "./SnippetMenu";
import { GitHubIcon, RedoIcon, ShareIcon, UndoIcon } from "./icons";

const REPO_URL = "https://github.com/clementlevasseur/map-style-editor";

interface ToolbarProps {
  onLoad: (text: string) => void;
  currentText: string;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function Toolbar({ onLoad, currentText, onReset, onUndo, onRedo, canUndo, canRedo }: ToolbarProps) {
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

  // Export: bundle style.json + a generated sprite into a zip when the style has
  // images; plain style.json otherwise.
  async function handleExport() {
    let style: unknown;
    try {
      style = JSON.parse(currentText);
    } catch {
      downloadStyle(currentText);
      return;
    }
    if (!Object.keys(getImages(style as never)).length) {
      downloadStyle(currentText);
      return;
    }
    setBusy(true);
    try {
      const sprite = await buildSprite(style as never);
      const enc = new TextEncoder();
      const files = [{ name: "style.json", data: enc.encode(currentText) }];
      if (sprite) {
        files.push({ name: "sprite.json", data: enc.encode(sprite.json) });
        files.push({ name: "sprite.png", data: new Uint8Array(await sprite.png.arrayBuffer()) });
      }
      downloadBlob(createZip(files), "map-style.zip");
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    setBusy(true);
    try {
      const { url: link, strippedImages } = await buildShareUrl(currentText);
      const note = strippedImages ? "\n\nNote: images aren't included in the link — use Export for those." : "";
      try {
        await navigator.clipboard.writeText(link);
        alert("Share link copied to clipboard." + note);
      } catch {
        // Clipboard blocked (permissions / non-secure context) — offer manual copy.
        prompt("Copy this share link:" + note, link);
      }
    } catch (e) {
      alert(`Could not create a share link.\n${e instanceof Error ? e.message : e}`);
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

      <button className="btn btn--icon" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        <UndoIcon />
      </button>
      <button className="btn btn--icon" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
        <RedoIcon />
      </button>

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
          {busy ? "…" : "Load"}
        </button>
      </div>

      <div className="toolbar__spacer" />

      <SavedMenu currentText={currentText} onLoad={onLoad} />
      <button className="btn" onClick={() => fileRef.current?.click()}>
        Import…
      </button>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} style={{ display: "none" }} />
      <button className="btn btn--primary" onClick={handleExport} disabled={busy}>
        Export
      </button>
      <button className="btn" onClick={handleShare} disabled={busy} title="Copy a shareable link">
        <ShareIcon /> Share
      </button>
      <SnippetMenu />
      <button className="btn" onClick={onReset} title="Back to the default style">
        Reset
      </button>
      <a className="btn btn--icon" href={REPO_URL} target="_blank" rel="noopener noreferrer" title="View on GitHub">
        <GitHubIcon />
      </a>
    </div>
  );
}
