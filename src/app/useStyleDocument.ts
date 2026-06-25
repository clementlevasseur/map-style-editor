import { useEffect, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { loadSavedStyle, saveStyle } from "../lib/persistence";
import { fetchStyleText } from "../lib/styleLoader";
import { DEFAULT_STYLE_URL, FALLBACK_STYLE } from "../lib/defaultStyle";
import { clearShareHash, readSharedStyle } from "../lib/share";

const FALLBACK_TEXT = JSON.stringify(FALLBACK_STYLE, null, 2);

export interface StyleDocument {
  text: string;
  parsedStyle: StyleSpecification | null;
  error: string | null;
  /** Raw text update (debounced parse + autosave); used by the JSON editor. */
  setText: (text: string) => void;
  /** Apply an already-valid style object immediately (no parse lag). */
  setStyleObject: (style: StyleSpecification) => void;
  /** Load the default remote style (falls back to an inline style offline). */
  loadDefault: () => void;
}

/**
 * Owns the edited style: text ⇄ parsed object, validation error, initial load
 * (shared link > saved work > default) and autosave. Single source of truth.
 */
export function useStyleDocument(): StyleDocument {
  const [text, setText] = useState("");
  const [parsedStyle, setParsedStyle] = useState<StyleSpecification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const shared = await readSharedStyle();
      if (shared) {
        setText(shared);
        clearShareHash();
        return;
      }
      const saved = loadSavedStyle();
      if (saved) {
        setText(saved);
        return;
      }
      try {
        setText(await fetchStyleText(DEFAULT_STYLE_URL));
      } catch {
        setText(FALLBACK_TEXT);
      }
    })();
  }, []);

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!text) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(text) as StyleSpecification;
        setParsedStyle(parsed);
        setError(null);
        saveStyle(text);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid JSON");
      }
    }, 300);
    return () => window.clearTimeout(timer.current);
  }, [text]);

  function setStyleObject(next: StyleSpecification) {
    setParsedStyle(next);
    setError(null);
    setText(JSON.stringify(next, null, 2));
  }

  function loadDefault() {
    fetchStyleText(DEFAULT_STYLE_URL).then(setText).catch(() => setText(FALLBACK_TEXT));
  }

  return { text, parsedStyle, error, setText, setStyleObject, loadDefault };
}
