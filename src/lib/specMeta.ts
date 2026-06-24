// Reads MapLibre's official style *reference* to drive the form-based UI editor:
// which paint/layout properties exist for a layer type, their control kind,
// allowed enum values, defaults and numeric bounds.
import { v8 } from "@maplibre/maplibre-gl-style-spec";

/* eslint-disable @typescript-eslint/no-explicit-any */
const spec = v8 as any;

export interface PropDef {
  name: string;
  type: string;
  doc?: string;
  values?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
}

export function layerTypes(): string[] {
  return Object.keys(spec.layer.type.values);
}

function groupProps(key: string): PropDef[] {
  const g = spec[key];
  if (!g) return [];
  return Object.keys(g).map((name) => {
    const d = g[name];
    const values =
      d.type === "enum" && d.values
        ? Array.isArray(d.values)
          ? d.values
          : Object.keys(d.values)
        : undefined;
    return {
      name,
      type: d.type,
      doc: d.doc,
      values,
      default: d.default,
      minimum: d.minimum,
      maximum: d.maximum,
    };
  });
}

export function paintProps(type: string): PropDef[] {
  return groupProps("paint_" + type);
}

export function layoutProps(type: string): PropDef[] {
  return groupProps("layout_" + type);
}
