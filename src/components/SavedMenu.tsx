import { useState } from "react";
import { deleteSaved, listSaved, saveStyleNamed, type SavedStyle } from "../lib/savedStyles";

interface Props {
  currentText: string;
  onLoad: (text: string) => void;
}

export default function SavedMenu({ currentText, onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [items, setItems] = useState<SavedStyle[]>(() => listSaved());

  function refresh() {
    setItems(listSaved());
  }

  function save() {
    const n = name.trim() || new Date().toLocaleString();
    saveStyleNamed(n, currentText, Date.now());
    setName("");
    refresh();
  }

  return (
    <div className="menu">
      <button
        className={"btn" + (open ? " btn--primary" : "")}
        onClick={() => { if (!open) refresh(); setOpen((o) => !o); }}
      >
        Saved
      </button>
      {open && (
        <div className="menu-pop">
          <div className="menu-row">
            <input
              className="input"
              placeholder="Name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <button className="btn btn--primary" onClick={save}>
              Save current
            </button>
          </div>
          {items.length === 0 && <div className="menu-empty">No saved styles yet.</div>}
          {items.map((s) => (
            <div className="menu-item" key={s.name}>
              <button className="menu-item__name" title="Load" onClick={() => { onLoad(s.text); setOpen(false); }}>
                {s.name}
              </button>
              <button className="menu-item__del" title="Delete" onClick={() => { deleteSaved(s.name); refresh(); }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
