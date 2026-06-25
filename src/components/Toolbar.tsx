import { useState } from "react";
import { downloadStyle } from "../lib/styleLoader";
import { TEMPLATES, templatesByGroup } from "../lib/templates";
import { getImages, getSpriteUrl } from "../lib/styleImages";
import { buildSprite, downloadBlob } from "../lib/sprite";
import { createZip } from "../lib/zip";
import { buildShareUrl } from "../lib/share";
import { toast } from "../lib/toast";
import Logo from "./Logo";
import SavedMenu from "./SavedMenu";
import SnippetMenu from "./SnippetMenu";
import MoreMenu from "./MoreMenu";
import { RedoIcon, ShareIcon, UndoIcon } from "./icons";

interface ToolbarProps {
  onLoad: (text: string) => void;
  currentText: string;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  styleName: string;
  onRename: (name: string) => void;
}

export default function Toolbar({ onLoad, currentText, onReset, onUndo, onRedo, canUndo, canRedo, styleName, onRename }: ToolbarProps) {
  const [busy, setBusy] = useState(false);

  function handleTemplate(e: React.ChangeEvent<HTMLSelectElement>) {
    const tpl = TEMPLATES.find((t) => t.id === e.target.value);
    e.target.value = "";
    if (!tpl) return;
    if (tpl.inline) {
      onLoad(JSON.stringify(tpl.inline, null, 2));
      return;
    }
    setBusy(true);
    import("../lib/styleLoader")
      .then(({ fetchStyleText }) => fetchStyleText(tpl.url!))
      .then(onLoad)
      .catch((err) => toast(`Failed to load the template: ${err instanceof Error ? err.message : err}`, "error"))
      .finally(() => setBusy(false));
  }

  // Export: bundle style.json + a generated sprite (referencing it) into a zip when
  // the style has images; plain style.json otherwise.
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
      const spriteUrl = getSpriteUrl(style as never) || "sprite";
      const exportStyle = { ...(style as Record<string, unknown>), sprite: spriteUrl };
      const enc = new TextEncoder();
      const files = [{ name: "style.json", data: enc.encode(JSON.stringify(exportStyle, null, 2)) }];
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
        toast("Share link copied to clipboard." + note, "success");
      } catch {
        prompt("Copy this share link:" + note, link);
      }
    } catch (e) {
      toast(`Could not create a share link: ${e instanceof Error ? e.message : e}`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar__brand">
        <Logo size={20} />
        <input
          className="toolbar__name"
          value={styleName}
          placeholder="untitled style"
          title="Style name"
          onChange={(e) => onRename(e.target.value)}
        />
      </div>

      <button className="btn btn--icon" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        <UndoIcon />
      </button>
      <button className="btn btn--icon" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
        <RedoIcon />
      </button>

      <select className="select" style={{ width: "auto" }} value="" onChange={handleTemplate} disabled={busy} title="Open a preset style">
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

      <div className="toolbar__spacer" />

      <SavedMenu currentText={currentText} onLoad={onLoad} />
      <SnippetMenu />
      <button className="btn" onClick={handleShare} disabled={busy} title="Copy a shareable link">
        <ShareIcon /> Share
      </button>
      <button className="btn btn--primary" onClick={handleExport} disabled={busy}>
        Export
      </button>
      <MoreMenu onLoad={onLoad} onReset={onReset} />
    </div>
  );
}
