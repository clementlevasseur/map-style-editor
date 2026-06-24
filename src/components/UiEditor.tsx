import { useMemo, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { layoutProps, paintProps, type PropDef } from "../lib/specMeta";
import PropertyControl from "./PropertyControl";
import { ExternalLinkIcon, InfoIcon } from "./icons";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  /** Last valid parsed style (source of truth lives in the JSON text). */
  style: StyleSpecification | null;
  /** Commit an edited style object back (the app re-serialises it to JSON). */
  onChange: (style: StyleSpecification) => void;
}

const TYPE_COLORS: Record<string, string> = {
  fill: "#7cc081",
  line: "#e3a85a",
  symbol: "#74a6e8",
  circle: "#cf8ad9",
  background: "#9aa1ad",
  raster: "#d99070",
  "fill-extrusion": "#62b6b6",
  heatmap: "#e3736f",
  hillshade: "#c0a86a",
  "color-relief": "#c0a86a",
};

function typeColor(t: string): string {
  return TYPE_COLORS[t] ?? "#8a8f99";
}

export default function UiEditor({ style, onChange }: Props) {
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState("");

  const layers = (style?.layers ?? []) as any[];
  const idx = Math.min(selected, Math.max(0, layers.length - 1));
  const layer = layers[idx];

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return layers
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => !q || String(l.id).toLowerCase().includes(q) || String(l.type).includes(q));
  }, [layers, filter]);

  // Source helpers for the "General" section.
  const sources = (style?.sources ?? {}) as Record<string, any>;
  const sourceNames = Object.keys(sources);
  const currentSourceType = layer?.source ? sources[layer.source]?.type : undefined;
  // source-layer only applies to vector tilesets (or unknown/missing sources).
  const showSourceLayer =
    layer && layer.type !== "background" && (currentSourceType === "vector" || currentSourceType === undefined);
  // Suggest source-layer values already used by sibling layers on the same source.
  const siblingSourceLayers = useMemo(
    () =>
      Array.from(
        new Set(
          layers
            .filter((l) => l.source === layer?.source && l["source-layer"])
            .map((l) => l["source-layer"] as string),
        ),
      ),
    [layers, layer?.source],
  );

  if (!style) {
    return (
      <div className="empty-note">
        Invalid JSON — fix it in the <strong>JSON</strong> tab to come back here.
      </div>
    );
  }

  function commit(mutator: (s: StyleSpecification) => void) {
    const next = structuredClone(style) as StyleSpecification;
    mutator(next);
    onChange(next);
  }

  function updateProp(kind: "paint" | "layout", name: string, value: unknown) {
    commit((s) => {
      const l = (s.layers as any[])[idx];
      if (!l) return;
      if (value === undefined) {
        if (l[kind]) delete l[kind][name];
      } else {
        l[kind] = { ...(l[kind] || {}), [name]: value };
      }
    });
  }

  function updateField(name: string, value: unknown) {
    commit((s) => {
      const l = (s.layers as any[])[idx];
      if (!l) return;
      if (value === undefined || value === "") delete l[name];
      else l[name] = value;
    });
  }

  function toggleVisibility(i: number) {
    commit((s) => {
      const l = (s.layers as any[])[i];
      const vis = l.layout?.visibility;
      l.layout = { ...(l.layout || {}), visibility: vis === "none" ? "visible" : "none" };
    });
  }

  return (
    <div className="panecol">
      <div className="layers" style={{ flex: "0 0 40%" }}>
        <div className="layers__head">
          <span className="layers__title">Layers</span>
          <span style={{ color: "var(--text-faint)", fontSize: 11 }}>{layers.length}</span>
        </div>
        <input
          className="input layers__filter"
          placeholder="Filter layers…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="layers__list">
          {layers.length === 0 && <div className="empty-note">No layers.</div>}
          {filtered.map(({ l, i }) => {
            const hidden = l.layout?.visibility === "none";
            return (
              <div
                key={l.id ?? i}
                className={"layer-row" + (i === idx ? " layer-row--active" : "")}
                onClick={() => setSelected(i)}
              >
                <button
                  className={"layer-row__eye" + (hidden ? " layer-row__eye--off" : "")}
                  title={hidden ? "Show" : "Hide"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility(i);
                  }}
                >
                  {hidden ? "🚫" : "👁"}
                </button>
                <span className="layer-row__name">{l.id ?? "(sans id)"}</span>
                <span className="type-badge" style={{ background: typeColor(l.type) }}>
                  {l.type}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="props">
        {layer ? (
          <>
            <div className="props__header">
              <span className="type-badge" style={{ background: typeColor(layer.type) }}>
                {layer.type}
              </span>
              <span className="name">{layer.id}</span>
            </div>

            <Section title="General">
              {layer.type !== "background" && (
                <Field
                  label="source"
                  doc="source"
                  help="The dataset this layer draws from — one of the style's sources."
                >
                  <select
                    className="select"
                    value={layer.source ?? ""}
                    onChange={(e) => updateField("source", e.target.value || undefined)}
                  >
                    <option value="">(none)</option>
                    {sourceNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    {layer.source && !sourceNames.includes(layer.source) && (
                      <option value={layer.source}>{layer.source} (missing)</option>
                    )}
                  </select>
                </Field>
              )}
              {showSourceLayer && (
                <Field
                  label="source-layer"
                  doc="source-layer"
                  help="For vector tilesets: which layer inside the tileset to render (e.g. water, roads, building)."
                >
                  <input
                    className="input"
                    list={`sl-${idx}`}
                    value={layer["source-layer"] ?? ""}
                    onChange={(e) => updateField("source-layer", e.target.value)}
                  />
                  <datalist id={`sl-${idx}`}>
                    {siblingSourceLayers.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </Field>
              )}
              <div className="prop-grid">
                <Field label="minzoom" doc="minzoom" help="The layer is hidden below this zoom level.">
                  <input
                    type="number"
                    className="input"
                    min={0}
                    max={24}
                    value={layer.minzoom ?? ""}
                    onChange={(e) =>
                      updateField("minzoom", e.target.value === "" ? undefined : Number(e.target.value))
                    }
                  />
                </Field>
                <Field label="maxzoom" doc="maxzoom" help="The layer is hidden at and above this zoom level.">
                  <input
                    type="number"
                    className="input"
                    min={0}
                    max={24}
                    value={layer.maxzoom ?? ""}
                    onChange={(e) =>
                      updateField("maxzoom", e.target.value === "" ? undefined : Number(e.target.value))
                    }
                  />
                </Field>
              </div>
            </Section>

            <PropSection title="Layout" defs={layoutProps(layer.type)} values={layer.layout} idx={idx} kind="layout" onChange={updateProp} />
            <PropSection title="Paint" defs={paintProps(layer.type)} values={layer.paint} idx={idx} kind="paint" onChange={updateProp} />
          </>
        ) : (
          <div className="empty-note">Select a layer.</div>
        )}
      </div>
    </div>
  );
}

function PropSection({
  title,
  defs,
  values,
  idx,
  kind,
  onChange,
}: {
  title: string;
  defs: PropDef[];
  values: Record<string, unknown> | undefined;
  idx: number;
  kind: "paint" | "layout";
  onChange: (kind: "paint" | "layout", name: string, value: unknown) => void;
}) {
  if (defs.length === 0) return null;
  return (
    <Section title={title}>
      {defs.map((def) => (
        <PropertyControl
          key={`${idx}:${kind}:${def.name}`}
          def={def}
          value={values?.[def.name]}
          onChange={(v) => onChange(kind, def.name, v)}
        />
      ))}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <div className="section__title">{title}</div>
      {children}
    </div>
  );
}

const DOC_BASE = "https://maplibre.org/maplibre-style-spec/layers/#";

function Field({
  label,
  help,
  doc,
  children,
}: {
  label: string;
  /** Tooltip text shown on the info icon. */
  help?: string;
  /** Anchor on the MapLibre layers spec page (e.g. "source-layer"). */
  doc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="prop">
      <div className="prop__label">
        <span>{label}</span>
        <span className="label-actions">
          {help && (
            <span className="info-icon" title={help}>
              <InfoIcon />
            </span>
          )}
          {doc && (
            <a
              className="doc-link"
              href={DOC_BASE + doc}
              target="_blank"
              rel="noopener noreferrer"
              title="Open MapLibre docs"
            >
              <ExternalLinkIcon />
            </a>
          )}
        </span>
      </div>
      {children}
    </div>
  );
}
