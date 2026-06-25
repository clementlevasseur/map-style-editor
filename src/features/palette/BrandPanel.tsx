import { useRef, useState } from "react";
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
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!style) {
    return <div className="empty-note">Fix the JSON first to apply a palette.</div>;
  }

  function generate(from = base) {
    setBase(from);
    setPal(derivePalette(from, dark, scheme));
    setMsg(null);
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

  function apply() {
    const r = applyPalette(style!, pal);
    onChange(r.style);
    setMsg(r.summary);
  }

  return (
    <div className="brand-panel">
      <div className="qh-note">
        Generate a coherent palette from a color, an image, or your site's brand — then{" "}
        <strong>Recolor map</strong>.
      </div>

      <div className="brand-base">
        <span className="qh-key">Base color</span>
        <input type="color" className="swatch" value={base} onChange={(e) => setBase(e.target.value)} />
        <input className="input" style={{ width: 100 }} value={base} onChange={(e) => setBase(e.target.value)} />
        <button className="btn" onClick={() => generate()}>
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
              onChange={(e) => { setPal((p) => ({ ...p, [role]: e.target.value })); setMsg(null); }}
            />
            <input
              className="input"
              value={pal[role]}
              onChange={(e) => { setPal((p) => ({ ...p, [role]: e.target.value })); setMsg(null); }}
            />
          </div>
        ))}
      </div>

      <div className="brand-actions">
        <button className="btn btn--primary" onClick={apply}>
          Recolor map
        </button>
        {msg && <span className="quickedit__msg ok">{msg}</span>}
      </div>
    </div>
  );
}
