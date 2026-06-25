import { useEffect, useMemo, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { runQuickEdit } from "@/lib/quickEdit";
import { toast } from "@/lib/toast";
import { PLACES } from "@/lib/places";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SectionId = "configure" | "layers" | "palette" | "images" | "code";

interface Cmd {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  style: StyleSpecification | null;
  onApplyStyle: (style: StyleSpecification) => void;
  onGoTo: (center: [number, number], zoom: number) => void;
  onSelectLayer: (id: string) => void;
  onSection: (id: SectionId) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
}

const QUICK_HINT = /#|\d|water|road|land|building|label|font|theme|opacity|width|hide|show|language|darken|lighten|saturate/;

export default function CommandPalette(props: Props) {
  const { open, onClose, style } = props;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const commands = useMemo<Cmd[]>(() => {
    const c = props.onClose;
    const sections: [SectionId, string][] = [
      ["configure", "Setup panel"],
      ["layers", "Layers panel"],
      ["palette", "Palette panel"],
      ["images", "Images panel"],
      ["code", "Code (JSON) panel"],
    ];
    const base: Cmd[] = [
      ...sections.map(([id, title]) => ({ id: "sec-" + id, group: "Go to", title, run: () => { props.onSection(id); c(); } })),
      { id: "undo", group: "Action", title: "Undo", run: () => { props.onUndo(); c(); } },
      { id: "redo", group: "Action", title: "Redo", run: () => { props.onRedo(); c(); } },
      { id: "reset", group: "Action", title: "Reset to default style", run: () => { props.onReset(); c(); } },
      ...PLACES.map((p) => ({ id: "go-" + p.name, group: "Go to", title: p.name, subtitle: "location", run: () => { props.onGoTo(p.center, p.zoom); c(); } })),
    ];
    const layers = ((style as any)?.layers ?? []) as any[];
    const layerCmds: Cmd[] = layers.map((l) => ({
      id: "layer-" + l.id,
      group: "Layer",
      title: String(l.id),
      subtitle: l.type,
      run: () => { props.onSelectLayer(String(l.id)); c(); },
    }));
    return [...base, ...layerCmds];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  const q = query.trim().toLowerCase();
  const items = useMemo<Cmd[]>(() => {
    const words = q.split(/\s+/).filter(Boolean);
    const matched = q
      ? commands.filter((cmd) => {
          const hay = (cmd.title + " " + cmd.group + " " + (cmd.subtitle ?? "")).toLowerCase();
          return words.every((w) => hay.includes(w));
        }).slice(0, 40)
      : commands.filter((cmd) => cmd.group !== "Layer").slice(0, 8);

    if (!q) return matched;
    const quick: Cmd = {
      id: "quick-edit",
      group: "Quick edit",
      title: `Run “${query.trim()}”`,
      run: () => {
        const r = runQuickEdit(style as never, query.trim());
        if (r.error) toast(r.error, "error");
        else if (r.style) {
          props.onApplyStyle(r.style);
          if (r.summary) toast(r.summary, "success");
        }
        onClose();
      },
    };
    return QUICK_HINT.test(q) ? [quick, ...matched] : [...matched, quick];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commands, q, query, style]);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;
  const run = (i: number) => items[i]?.run();

  return (
    <div className="cmdk-backdrop" onMouseDown={onClose}>
      <div className="cmdk" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk__input"
          placeholder="Command, color, place or layer…  e.g. water #0a7e8c · go London · font Roboto"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); run(active); }
            else if (e.key === "Escape") { e.preventDefault(); onClose(); }
          }}
        />
        <div className="cmdk__list">
          {items.length === 0 && <div className="cmdk__empty">No matches</div>}
          {items.map((cmd, i) => (
            <button
              key={cmd.id}
              className={"cmdk__item" + (i === active ? " cmdk__item--active" : "")}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(i)}
            >
              <span className="cmdk__title">{cmd.title}</span>
              <span className="cmdk__group">{cmd.subtitle || cmd.group}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
