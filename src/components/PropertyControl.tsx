import { useState } from "react";
import type { PropDef } from "../lib/specMeta";
import { ExternalLinkIcon, InfoIcon } from "./icons";

interface Props {
  def: PropDef;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Raw JSON editor for expression/array/object values (commit on blur). */
function ExprField({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value));
  return (
    <input
      className="input"
      style={{ fontFamily: "var(--mono)", fontSize: 11 }}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        try {
          onChange(JSON.parse(text));
        } catch {
          /* keep last valid value */
        }
      }}
    />
  );
}

export default function PropertyControl({ def, value, onChange }: Props) {
  const isExpr = Array.isArray(value) || (value !== null && typeof value === "object");
  const set = (v: unknown) => onChange(v);

  let control: React.ReactNode;

  if (isExpr) {
    control = <ExprField value={value} onChange={onChange} />;
  } else if (def.type === "color") {
    const hex = typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
    control = (
      <div className="color-control">
        <input type="color" className="swatch" value={hex} onChange={(e) => set(e.target.value)} />
        <input
          className="input"
          value={value == null ? "" : String(value)}
          placeholder={def.default != null ? String(def.default) : "#000000"}
          onChange={(e) => set(e.target.value || undefined)}
        />
      </div>
    );
  } else if (def.type === "boolean") {
    const checked = value === undefined ? Boolean(def.default) : Boolean(value);
    control = (
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} />
        <span className="switch__track" />
      </label>
    );
  } else if (def.type === "enum" && def.values) {
    control = (
      <select
        className="select"
        value={value == null ? "" : String(value)}
        onChange={(e) => set(e.target.value || undefined)}
      >
        <option value="">(default{def.default != null ? ` · ${def.default}` : ""})</option>
        {def.values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  } else if (def.type === "number") {
    const hasRange = typeof def.minimum === "number" && typeof def.maximum === "number";
    const num = (
      <input
        type="number"
        className="input num"
        value={value == null ? "" : Number(value)}
        min={def.minimum}
        max={def.maximum}
        step="any"
        placeholder={def.default != null ? String(def.default) : ""}
        onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    );
    control = hasRange ? (
      <div className="slider-control">
        <input
          type="range"
          min={def.minimum}
          max={def.maximum}
          step={(def.maximum! - def.minimum!) / 100 || 0.01}
          value={value == null ? Number(def.default ?? def.minimum) : Number(value)}
          onChange={(e) => set(Number(e.target.value))}
        />
        {num}
      </div>
    ) : (
      num
    );
  } else {
    control = (
      <input
        className="input"
        value={value == null ? "" : String(value)}
        placeholder={def.default != null ? String(def.default) : ""}
        onChange={(e) => set(e.target.value || undefined)}
      />
    );
  }

  return (
    <div className="prop">
      <div className="prop__label">
        <span>{def.name}</span>
        {isExpr && <span className="fn">ƒ expr</span>}
        <span className="label-actions">
          {def.doc && (
            <span className="info-icon" title={def.doc}>
              <InfoIcon />
            </span>
          )}
          <a
            className="doc-link"
            href={`https://maplibre.org/maplibre-style-spec/layers/#${def.name}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open MapLibre docs"
          >
            <ExternalLinkIcon />
          </a>
        </span>
      </div>
      {control}
    </div>
  );
}
