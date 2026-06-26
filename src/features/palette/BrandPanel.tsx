import { useEffect, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import {
  applyPalette,
  derivePalette,
  DEFAULT_PALETTE,
  PALETTE_ROLES,
  readPalette,
  type Palette,
} from "@/lib/palette";
import type { Scheme } from "@/lib/color";
import { dominantColor } from "@/lib/imagePalette";
import { toast } from "@/lib/toast";

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

export default function BrandPanel({ style, onChange }: Props) {
  const [pal, setPal] = useState<Palette>(() => (style ? readPalette(style) : DEFAULT_PALETTE));
  const [base, setBase] = useState("#3b6fe2");
  const [dark, setDark] = useState(false);
  const [scheme, setScheme] = useState<Scheme>("mono");
  const fileRef = useRef<HTMLInputElement>(null);

  // Apply onto the freshest style, and debounce continuous edits (picker drag).
  const styleRef = useRef(style);
  useEffect(() => {
    styleRef.current = style;
  }, [style]);
  const timer = useRef<number | undefined>(undefined);

  if (!style) {
    return <div className="empty-note">Fix the JSON first to apply a palette.</div>;
  }

  function recolor(next: Palette) {
    if (styleRef.current) onChange(applyPalette(styleRef.current, next).style);
  }

  /** Continuous edit (swatch/hex): update the panel now, recolor shortly after. */
  function liveEdit(next: Palette) {
    setPal(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => recolor(next), 150);
  }

  /** Discrete action (Generate / image): update and recolor immediately. */
  function setAndRecolor(next: Palette) {
    window.clearTimeout(timer.current);
    setPal(next);
    recolor(next);
  }

  function generate(from = base) {
    setBase(from);
    setAndRecolor(derivePalette(from, dark, scheme));
  }

  async function fromImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const color = await dominantColor(await readDataURL(file));
      generate(color);
      toast(`Palette generated from image (${color}).`, "success");
    } catch {
      toast("Could not read colors from that image.", "error");
    }
  }

  return (
    <div className="brand-panel">
      <div className="qh-note">
        Edit any color and the map recolors live. Generate a coherent palette from a color, an image
        or your brand.
      </div>

      <div className="brand-base">
        <span className="qh-key">Base color</span>
        <input type="color" className="swatch" value={base} onChange={(e) => setBase(e.target.value)} />
        <input className="input" style={{ width: 100 }} value={base} onChange={(e) => setBase(e.target.value)} />
        <button className="btn btn--primary" onClick={() => generate()}>
          Generate
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          From image…
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={fromImage} style={{ display: "none" }} />

        <select className="select" style={{ width: "auto" }} value={scheme} onChange={(e) => setScheme(e.target.value as Scheme)}>
          <option value="mono">Monochrome</option>
          <option value="analogous">Analogous</option>
          <option value="complementary">Complementary</option>
        </select>

        <label className="switch" title="Generate a dark palette">
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
          <span className="switch__track" />
        </label>
        <span className="brand-role" style={{ flex: "0 0 auto" }}>
          Dark
        </span>
      </div>

      <div className="brand-grid">
        {PALETTE_ROLES.map((role) => (
          <div className="brand-row" key={role}>
            <span className="brand-role">{role}</span>
            <input
              type="color"
              className="swatch"
              value={/^#[0-9a-fA-F]{6}$/.test(pal[role]) ? pal[role] : "#000000"}
              onChange={(e) => liveEdit({ ...pal, [role]: e.target.value })}
            />
            <input
              className="input"
              value={pal[role]}
              onChange={(e) => liveEdit({ ...pal, [role]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
