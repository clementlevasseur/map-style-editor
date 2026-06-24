import { useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import {
  applyPalette,
  derivePalette,
  DEFAULT_PALETTE,
  PALETTE_ROLES,
  readPalette,
  type Palette,
} from "../lib/palette";

interface Props {
  style: StyleSpecification | null;
  onChange: (style: StyleSpecification) => void;
}

export default function BrandPanel({ style, onChange }: Props) {
  const [pal, setPal] = useState<Palette>(() => (style ? readPalette(style) : DEFAULT_PALETTE));
  const [base, setBase] = useState("#3b6fe2");
  const [dark, setDark] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!style) {
    return <div className="empty-note">Fix the JSON first to apply a palette.</div>;
  }

  function setRole(role: string, value: string) {
    setPal((p) => ({ ...p, [role]: value }));
    setMsg(null);
  }

  function apply() {
    const r = applyPalette(style!, pal);
    onChange(r.style);
    setMsg(r.summary);
  }

  return (
    <div className="brand-panel">
      <div className="qh-note">
        Set the colors below — type a base color and <strong>Generate</strong> a coherent palette,
        or edit each role — then <strong>Recolor map</strong> to apply.
      </div>

      <div className="brand-base">
        <span className="qh-key">Base color</span>
        <input type="color" className="swatch" value={base} onChange={(e) => setBase(e.target.value)} />
        <input className="input" style={{ width: 100 }} value={base} onChange={(e) => setBase(e.target.value)} />
        <button className="btn" onClick={() => { setPal(derivePalette(base, dark)); setMsg(null); }}>
          Generate from color
        </button>
        <label className="switch" title="Generate a dark palette">
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
          <span className="switch__track" />
        </label>
        <span className="brand-role" style={{ flex: "0 0 auto" }}>
          Dark mode
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
              onChange={(e) => setRole(role, e.target.value)}
            />
            <input className="input" value={pal[role]} onChange={(e) => setRole(role, e.target.value)} />
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
