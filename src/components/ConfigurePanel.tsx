import { useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import {
  applyPreset,
  CATEGORIES,
  categoryStats,
  PRESETS,
  setDensity,
  toggleCategory,
  type Density,
} from "../lib/categories";
import { applyPalette, derivePalette } from "../lib/palette";
import { runQuickEdit } from "../lib/quickEdit";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  style: StyleSpecification | null;
  onChange: (style: StyleSpecification) => void;
}

const LANGS: [string, string][] = [
  ["local", "Local"],
  ["en", "English"],
  ["fr", "French"],
  ["de", "German"],
  ["es", "Spanish"],
  ["it", "Italian"],
];

export default function ConfigurePanel({ style, onChange }: Props) {
  const [base, setBase] = useState("#3b6fe2");
  const [dark, setDark] = useState(false);

  if (!style) {
    return <div className="empty-note">Fix the JSON first to configure the map.</div>;
  }
  const layers = ((style as any).layers ?? []) as any[];

  function setLang(code: string) {
    const r = runQuickEdit(style!, `language ${code}`);
    if (r.style) onChange(r.style);
  }

  return (
    <div className="config-panel">
      <section className="config-section">
        <div className="config-h">Start from a preset</div>
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button key={p.key} className="btn" onClick={() => onChange(applyPreset(style!, p))}>
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="config-section">
        <div className="config-h">Detail</div>
        <div className="seg">
          {(["minimal", "balanced", "detailed"] as Density[]).map((d) => (
            <button key={d} className="seg__btn" onClick={() => onChange(setDensity(style!, d))}>
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="config-section">
        <div className="config-h">Show on the map</div>
        <div className="cat-list">
          {CATEGORIES.map((c) => {
            const { total, visible } = categoryStats(layers, c);
            if (!total) return null;
            return (
              <label className="cat-row" key={c.key}>
                <span className="switch">
                  <input
                    type="checkbox"
                    checked={visible > 0}
                    onChange={(e) => onChange(toggleCategory(style!, c.key, e.target.checked))}
                  />
                  <span className="switch__track" />
                </span>
                <span className="cat-row__label">{c.label}</span>
                <span className="cat-row__count">{visible}/{total}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="config-section">
        <div className="config-h">Colors</div>
        <div className="config-row">
          <input type="color" className="swatch" value={base} onChange={(e) => setBase(e.target.value)} />
          <input className="input" style={{ width: 96 }} value={base} onChange={(e) => setBase(e.target.value)} />
          <label className="switch" title="Dark palette">
            <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
            <span className="switch__track" />
          </label>
          <span className="brand-role" style={{ flex: "0 0 auto" }}>
            Dark
          </span>
          <button className="btn btn--primary" onClick={() => onChange(applyPalette(style!, derivePalette(base, dark)).style)}>
            Apply colors
          </button>
        </div>
      </section>

      <section className="config-section">
        <div className="config-h">Labels language</div>
        <select className="select" style={{ width: "auto" }} defaultValue="" onChange={(e) => e.target.value && setLang(e.target.value)}>
          <option value="">Choose a language…</option>
          {LANGS.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </section>
    </div>
  );
}
