import { useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { runQuickEdit } from "../lib/quickEdit";
import BrandPanel from "./BrandPanel";

interface Props {
  style: StyleSpecification | null;
  onChange: (style: StyleSpecification) => void;
  contrastLow?: boolean;
}

const EXAMPLES: { group: string; items: string[] }[] = [
  {
    group: "Colors",
    items: [
      "background #ffffff",
      "water #0a7e8c",
      "roads #888888",
      "land beige",
      "buildings #dddddd",
      "labels #333333",
    ],
  },
  {
    group: "Size & more",
    items: ["roads width 2", "water opacity 0.6", "labels size 14", "hide buildings", "show water"],
  },
  {
    group: "Fonts",
    items: ["font Metropolis Bold", "font Roboto", "font Open Sans Bold"],
  },
];

type PanelKind = "none" | "commands" | "brand";

export default function QuickEditBar({ style, onChange, contrastLow }: Props) {
  const [cmd, setCmd] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [panel, setPanel] = useState<PanelKind>("none");
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = (k: PanelKind) => setPanel((p) => (p === k ? "none" : k));

  function run(text = cmd) {
    if (!text.trim()) return;
    if (!style) {
      setMsg({ text: "Fix the JSON first.", ok: false });
      return;
    }
    const r = runQuickEdit(style, text);
    if (r.error) {
      setMsg({ text: r.error, ok: false });
      return;
    }
    if (r.style) {
      onChange(r.style);
      setMsg({ text: r.summary ?? "Done.", ok: true });
      setCmd("");
    }
  }

  function useExample(text: string) {
    setCmd(text);
    setMsg(null);
    inputRef.current?.focus();
  }

  return (
    <div className="quickedit-wrap">
      <div className="quickedit">
        <span className="quickedit__label">Quick edit</span>
        <input
          ref={inputRef}
          className="input"
          style={{ flex: 1 }}
          placeholder={'e.g. "water #0a7e8c", "background #fff", "labels #333", "font Metropolis Bold"'}
          value={cmd}
          onChange={(e) => {
            setCmd(e.target.value);
            if (msg) setMsg(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && run()}
        />
        <button className="btn" onClick={() => run()}>
          Apply
        </button>
        <button
          className={"btn" + (panel === "brand" ? " btn--primary" : "")}
          onClick={() => toggle("brand")}
          title="Apply a brand palette"
        >
          Brand
        </button>
        <button
          className={"btn" + (panel === "commands" ? " btn--primary" : "")}
          onClick={() => toggle("commands")}
          title="Show available commands"
        >
          Commands
        </button>
        {msg && <span className={"quickedit__msg " + (msg.ok ? "ok" : "err")}>{msg.text}</span>}
        {!msg && contrastLow && (
          <span className="quickedit__msg err" title="Label color may be hard to read on the background">
            ⚠ Low label contrast
          </span>
        )}
      </div>

      {panel === "brand" && <BrandPanel style={style} onChange={onChange} />}

      {panel === "commands" && (
        <div className="quickedit-help">
          <div className="qh-row">
            <span className="qh-key">Syntax</span>
            <span className="qh-val">
              <code>&lt;target&gt; &lt;color&gt;</code> or <code>font &lt;name&gt;</code> — press Enter.
            </span>
          </div>
          <div className="qh-row">
            <span className="qh-key">Targets</span>
            <span className="qh-val">
              background/fond · water/eau · roads/routes · land/terre · buildings/bâtiments ·
              labels/texte · boundaries/frontières
            </span>
          </div>
          <div className="qh-row">
            <span className="qh-key">Colors</span>
            <span className="qh-val">
              hex (<code>#ff0055</code>) or names: white, black, grey, red, green, blue, teal, navy,
              beige, sand, cream, gold, orange, purple, pink, brown
            </span>
          </div>
          {EXAMPLES.map((g) => (
            <div className="qh-row" key={g.group}>
              <span className="qh-key">{g.group}</span>
              <span className="qh-chips">
                {g.items.map((ex) => (
                  <button key={ex} className="qh-chip" onClick={() => useExample(ex)}>
                    {ex}
                  </button>
                ))}
              </span>
            </div>
          ))}
          <div className="qh-note">Click an example to load it, tweak it, then press Enter.</div>
        </div>
      )}
    </div>
  );
}
