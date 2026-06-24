import { useMemo, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { layerTypes, layoutProps, paintProps, type PropDef } from "../lib/specMeta";
import { imageNames } from "../lib/styleImages";
import { FONTS, GLYPHS_URL, shouldSwitchGlyphs } from "../lib/fonts";
import { useDismiss } from "../lib/useDismiss";
import PropertyControl from "./PropertyControl";
import { ExternalLinkIcon, EyeIcon, EyeOffIcon, InfoIcon } from "./icons";

/* eslint-disable @typescript-eslint/no-explicit-any */
function defaultPaint(type: string): Record<string, unknown> {
  switch (type) {
    case "fill": return { "fill-color": "#9aa0ad", "fill-opacity": 0.6 };
    case "line": return { "line-color": "#6c7382", "line-width": 1 };
    case "circle": return { "circle-color": "#cf5b5b", "circle-radius": 4 };
    case "background": return { "background-color": "#cccccc" };
    case "fill-extrusion": return { "fill-extrusion-color": "#9aa0ad", "fill-extrusion-height": 10 };
    case "symbol": return { "text-color": "#333333" };
    default: return {};
  }
}
function defaultLayout(type: string): Record<string, unknown> | undefined {
  if (type === "symbol") return { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 12 };
  return undefined;
}

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
  const [adding, setAdding] = useState(false);
  const [nl, setNl] = useState({ type: "fill", source: "", sourceLayer: "" });
  const addRef = useRef<HTMLDivElement>(null);
  useDismiss(addRef, adding, () => setAdding(false));

  const layers = (style?.layers ?? []) as any[];
  const idx = Math.min(selected, Math.max(0, layers.length - 1));
  const layer = layers[idx];
  const imageOpts = imageNames(style);

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
  // Source-layers already used anywhere in the style — pick-list for new layers.
  const usedSourceLayers = useMemo(
    () => (Array.from(new Set(layers.map((l) => l["source-layer"]).filter(Boolean))) as string[]).sort(),
    [layers],
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
      // Picking a curated font: make sure the style's glyphs server provides it.
      if (kind === "layout" && name === "text-font" && Array.isArray(value)) {
        const wanted = value.find((v) => FONTS.includes(v));
        if (wanted && shouldSwitchGlyphs((s as any).glyphs)) {
          (s as any).glyphs = GLYPHS_URL;
        }
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

  function uniqueId(base: string): string {
    const ids = new Set(layers.map((l) => l.id));
    if (!ids.has(base)) return base;
    let n = 1;
    while (ids.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  }

  function defaultSource(): string {
    const counts = new Map<string, number>();
    for (const l of layers) if (l.source) counts.set(l.source, (counts.get(l.source) ?? 0) + 1);
    let best = sourceNames[0] ?? "";
    let max = 0;
    for (const [s, n] of counts) if (n > max) { max = n; best = s; }
    return best;
  }

  function openAdd() {
    setNl({ type: "fill", source: defaultSource(), sourceLayer: "" });
    setAdding(true);
  }

  function createLayer() {
    const { type, source, sourceLayer } = nl;
    const id = uniqueId(type + (sourceLayer ? `-${sourceLayer}` : ""));
    commit((s) => {
      const layer: any = { id, type };
      if (type !== "background") {
        if (source) layer.source = source;
        if (sourceLayer) layer["source-layer"] = sourceLayer;
      }
      const lay = defaultLayout(type);
      if (lay) layer.layout = lay;
      layer.paint = defaultPaint(type);
      (s.layers as any[]).push(layer);
      if (type === "symbol" && shouldSwitchGlyphs((s as any).glyphs)) (s as any).glyphs = GLYPHS_URL;
    });
    setSelected(layers.length);
    setAdding(false);
  }

  function duplicateLayer(i: number) {
    commit((s) => {
      const arr = s.layers as any[];
      const copy = structuredClone(arr[i]);
      copy.id = uniqueId(`${arr[i].id}-copy`);
      arr.splice(i + 1, 0, copy);
    });
    setSelected(i + 1);
  }

  function deleteLayer(i: number) {
    commit((s) => {
      (s.layers as any[]).splice(i, 1);
    });
    setSelected(Math.max(0, i - 1));
  }

  function moveLayer(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= layers.length) return;
    commit((s) => {
      const arr = s.layers as any[];
      [arr[i], arr[j]] = [arr[j], arr[i]];
    });
    setSelected(j);
  }

  function renameLayer(i: number, id: string) {
    commit((s) => {
      (s.layers as any[])[i].id = id;
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
                  {hidden ? <EyeOffIcon /> : <EyeIcon />}
                </button>
                <span className="layer-row__name">{l.id ?? "(sans id)"}</span>
                <span className="type-badge" style={{ background: typeColor(l.type) }}>
                  {l.type}
                </span>
              </div>
            );
          })}
        </div>
        <div className="addlayer-wrap" ref={addRef}>
          <button className="layers__add" onClick={() => (adding ? setAdding(false) : openAdd())}>
            + Add layer
          </button>
          {adding && (
            <div className="addlayer">
              <div className="addlayer__row">
                <label>Type</label>
                <select className="select" value={nl.type} onChange={(e) => setNl((v) => ({ ...v, type: e.target.value }))}>
                  {layerTypes().map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {nl.type !== "background" && (
                <>
                  <div className="addlayer__row">
                    <label>Source</label>
                    <select className="select" value={nl.source} onChange={(e) => setNl((v) => ({ ...v, source: e.target.value }))}>
                      <option value="">(none)</option>
                      {sourceNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="addlayer__row">
                    <label>Source layer</label>
                    <input
                      className="input"
                      list="nl-srclayers"
                      placeholder="e.g. water, transportation…"
                      value={nl.sourceLayer}
                      onChange={(e) => setNl((v) => ({ ...v, sourceLayer: e.target.value }))}
                    />
                    <datalist id="nl-srclayers">
                      {usedSourceLayers.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </>
              )}
              <div className="addlayer__actions">
                <button className="btn btn--primary" onClick={createLayer}>
                  Add layer
                </button>
                <button className="btn" onClick={() => setAdding(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="props">
        {layer ? (
          <>
            <div className="props__header">
              <span className="type-badge" style={{ background: typeColor(layer.type) }}>
                {layer.type}
              </span>
              <input
                className="input props__name"
                value={layer.id ?? ""}
                title="Rename layer"
                onChange={(e) => renameLayer(idx, e.target.value)}
              />
              <div className="props__actions">
                <button className="btn btn--icon" title="Move up" onClick={() => moveLayer(idx, -1)} disabled={idx === 0}>
                  ▲
                </button>
                <button className="btn btn--icon" title="Move down" onClick={() => moveLayer(idx, 1)} disabled={idx === layers.length - 1}>
                  ▼
                </button>
                <button className="btn btn--icon" title="Duplicate" onClick={() => duplicateLayer(idx)}>
                  ⧉
                </button>
                <button className="btn btn--icon" title="Delete" onClick={() => deleteLayer(idx)}>
                  ✕
                </button>
              </div>
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

            <PropSection title="Layout" defs={layoutProps(layer.type)} values={layer.layout} idx={idx} kind="layout" images={imageOpts} fonts={FONTS} onChange={updateProp} />
            <PropSection title="Paint" defs={paintProps(layer.type)} values={layer.paint} idx={idx} kind="paint" images={imageOpts} fonts={FONTS} onChange={updateProp} />
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
  images,
  fonts,
  onChange,
}: {
  title: string;
  defs: PropDef[];
  values: Record<string, unknown> | undefined;
  idx: number;
  kind: "paint" | "layout";
  images: string[];
  fonts: string[];
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
          imageOptions={images}
          fontOptions={fonts}
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
