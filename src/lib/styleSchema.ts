// Generates a JSON Schema (draft-07) from MapLibre's official style *reference*
// (`v8`) so Monaco can offer autocompletion + hover docs for the WHOLE spec —
// root properties, every source type, and per-layer-type paint/layout props.
//
// Note: values are intentionally left permissive (expressions/functions are
// valid anywhere data-driven), so this schema is used for COMPLETION/HOVER only.
// Authoritative error checking is done separately by `validateStyleMin`.
// Use the JSON reference (not the `v8` JS export) so schema descriptions keep the
// `doc` strings — the JS build strips them.
import specJson from "@maplibre/maplibre-gl-style-spec/dist/latest.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
const spec = specJson as any;

function enumValues(def: any): string[] | null {
  if (def?.type === "enum" && def.values) {
    return Array.isArray(def.values) ? def.values.slice() : Object.keys(def.values);
  }
  return null;
}

function propToSchema(def: any): any {
  const s: any = {};
  if (def?.doc) s.description = def.doc;
  const ev = enumValues(def);
  if (ev) s.enum = ev;
  return s;
}

function propsFromGroup(groupKey: string): Record<string, any> {
  const group = spec[groupKey];
  const out: Record<string, any> = {};
  if (!group) return out;
  for (const key of Object.keys(group)) out[key] = propToSchema(group[key]);
  return out;
}

const LAYER_TYPES: string[] = Object.keys(spec.layer.type.values);

function layerSchema(): any {
  const base: any = {
    type: "object",
    properties: {
      id: { type: "string", description: spec.layer.id.doc },
      type: { enum: LAYER_TYPES, description: spec.layer.type.doc },
      source: { type: "string", description: spec.layer.source.doc },
      "source-layer": { type: "string", description: spec.layer["source-layer"].doc },
      minzoom: { type: "number", minimum: 0, maximum: 24, description: spec.layer.minzoom.doc },
      maxzoom: { type: "number", minimum: 0, maximum: 24, description: spec.layer.maxzoom.doc },
      filter: { description: spec.layer.filter.doc },
      layout: { type: "object", description: spec.layer.layout.doc },
      paint: { type: "object", description: spec.layer.paint.doc },
      metadata: { description: spec.layer.metadata.doc },
    },
    required: ["id", "type"],
    additionalProperties: true,
    allOf: [] as any[],
  };
  for (const t of LAYER_TYPES) {
    base.allOf.push({
      if: { properties: { type: { const: t } } },
      then: {
        properties: {
          paint: {
            type: "object",
            properties: propsFromGroup("paint_" + t),
            additionalProperties: true,
          },
          layout: {
            type: "object",
            properties: propsFromGroup("layout_" + t),
            additionalProperties: true,
          },
        },
      },
    });
  }
  return base;
}

function sourceSchema(): any {
  const types: string[] = Array.isArray(spec.source) ? spec.source : Object.keys(spec.source);
  const base: any = {
    type: "object",
    properties: { type: { enum: types } },
    additionalProperties: true,
    allOf: [] as any[],
  };
  for (const t of types) {
    const grp = spec["source_" + t.replace(/-/g, "_")];
    if (!grp) continue;
    const props: Record<string, any> = {};
    for (const k of Object.keys(grp)) props[k] = propToSchema(grp[k]);
    base.allOf.push({ if: { properties: { type: { const: t } } }, then: { properties: props } });
  }
  return base;
}

function buildRootSchema(): any {
  const root = spec.$root;
  const props: Record<string, any> = {};
  for (const key of Object.keys(root)) {
    const def = root[key];
    if (key === "layers") {
      props[key] = { type: "array", items: layerSchema(), description: def.doc };
    } else if (key === "sources") {
      props[key] = { type: "object", additionalProperties: sourceSchema(), description: def.doc };
    } else {
      props[key] = propToSchema(def);
    }
  }
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "MapLibre Style",
    type: "object",
    properties: props,
    additionalProperties: true,
  };
}

export const MAPLIBRE_STYLE_SCHEMA = buildRootSchema();
export const STYLE_SPEC_VERSION: number = spec.$version;
