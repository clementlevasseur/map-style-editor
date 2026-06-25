import { useEffect, useState } from "react";

const MAX = 60;

export interface History {
  /** Snapshot the current text before a discrete change, so it can be undone. */
  record: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Undo/redo over the document text for discrete actions (UI edits, quick edits,
 * loads). Raw typing in the JSON editor keeps Monaco's own undo — we defer to it
 * when the editor or an input is focused.
 */
export function useHistory(text: string, setText: (t: string) => void): History {
  const [past, setPast] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  function record() {
    setPast((p) => [...p, text].slice(-MAX));
    setFuture([]);
  }
  function undo() {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [text, ...f]);
      setText(prev);
      return p.slice(0, -1);
    });
  }
  function redo() {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setPast((p) => [...p, text]);
      setText(next);
      return f.slice(1);
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest(".monaco-editor, input, textarea, [contenteditable=true]")) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, past, future]);

  return { record, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
