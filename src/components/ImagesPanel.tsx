import { useRef } from "react";
import type { StyleSpecification } from "maplibre-gl";
import {
  getImages,
  getSpriteUrl,
  loadImageEl,
  removeImage,
  setImage,
  setSpriteUrl,
  type EditorImage,
} from "../lib/styleImages";
import { toast } from "../lib/toast";

interface Props {
  style: StyleSpecification | null;
  onChange: (style: StyleSpecification) => void;
}

function readDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("read error"));
    r.readAsDataURL(file);
  });
}

function sanitizeName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}

export default function ImagesPanel({ style, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  if (!style) {
    return (
      <div className="empty-note">
        Invalid JSON — fix it in the <strong>JSON</strong> tab to manage images.
      </div>
    );
  }

  const images = getImages(style);
  const entries = Object.entries(images);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    let next = style!;
    for (const file of files) {
      try {
        const data = await readDataURL(file);
        const el = await loadImageEl(data);
        let name = sanitizeName(file.name);
        while (getImages(next)[name]) name += "-1";
        const img: EditorImage = {
          data,
          pixelRatio: 1,
          sdf: false,
          width: el.naturalWidth,
          height: el.naturalHeight,
        };
        next = setImage(next, name, img);
      } catch {
        toast(`Could not read image: ${file.name}`, "error");
      }
    }
    onChange(next);
  }

  function updateMeta(name: string, patch: Partial<EditorImage>) {
    onChange(setImage(style!, name, { ...images[name], ...patch }));
  }

  return (
    <div className="panecol" style={{ overflowY: "auto" }}>
      <div className="images-head">
        <button className="btn btn--primary" onClick={() => fileRef.current?.click()}>
          Add image…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          multiple
          onChange={handleFiles}
          style={{ display: "none" }}
        />
      </div>

      <p className="empty-note" style={{ paddingTop: 0 }}>
        Images render live in the preview (via <code>addImage</code>) and are saved inside the
        style. When the style has images, the top-right <strong>Export</strong> downloads a zip with
        <code>style.json</code> + a generated <code>sprite.png</code>/<code>sprite.json</code>; host
        the sprite statically and set the style's <code>sprite</code> to its URL.
      </p>

      {entries.length > 0 && (
        <div style={{ padding: "0 12px 6px" }}>
          <div className="prop">
            <div className="prop__label">
              <span>Sprite URL (used by Export)</span>
            </div>
            <input
              className="input"
              placeholder="sprite"
              value={getSpriteUrl(style)}
              onChange={(e) => onChange(setSpriteUrl(style!, e.target.value))}
            />
            <div className="prop__help">
              The exported <code>style.json</code> references this as its <code>sprite</code> (no
              extension). Leave empty to use <code>sprite</code> — host the files next to it.
            </div>
          </div>
        </div>
      )}

      {entries.length === 0 && <div className="empty-note">No images yet.</div>}

      <div className="images-list">
        {entries.map(([name, img]) => (
          <div className="image-row" key={name}>
            <div className="image-thumb">
              <img src={img.data} alt={name} />
            </div>
            <div className="image-meta">
              <div className="image-name">{name}</div>
              <div className="image-sub">
                {img.width}×{img.height}
              </div>
              <div className="image-controls">
                <label title="Pixel ratio (use 2 for @2x images)">
                  @
                  <input
                    type="number"
                    className="input"
                    min={1}
                    max={4}
                    step={1}
                    value={img.pixelRatio}
                    onChange={(e) => updateMeta(name, { pixelRatio: Number(e.target.value) || 1 })}
                  />
                </label>
                <label className="image-sdf" title="SDF: recolorable monochrome icon">
                  <input
                    type="checkbox"
                    checked={img.sdf}
                    onChange={(e) => updateMeta(name, { sdf: e.target.checked })}
                  />
                  SDF
                </label>
              </div>
            </div>
            <button
              className="btn image-del"
              title="Remove"
              onClick={() => onChange(removeImage(style!, name))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
