import { useEffect, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Toolbar from "./components/Toolbar";
import StyleEditor from "./components/StyleEditor";
import UiEditor from "./components/UiEditor";
import ImagesPanel from "./components/ImagesPanel";
import MapPreview from "./components/MapPreview";
import QuickEditBar from "./components/QuickEditBar";
import { clearSavedStyle, loadSavedStyle, saveStyle } from "./lib/persistence";
import { fetchStyleText } from "./lib/styleLoader";
import { DEFAULT_STYLE_URL, FALLBACK_STYLE } from "./lib/defaultStyle";
import { clearShareHash, readSharedStyle } from "./lib/share";
import { checkLabelContrast } from "./lib/contrast";

const FALLBACK_TEXT = JSON.stringify(FALLBACK_STYLE, null, 2);
const HISTORY_MAX = 60;

export default function App() {
  const [text, setText] = useState<string>("");
  const [parsedStyle, setParsedStyle] = useState<StyleSpecification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"ui" | "json" | "images">("ui");
  const [past, setPast] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  // Initial load: shared link (#s=) > saved work > default remote style > fallback.
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

  // Debounced parse: keep last valid style on the map, surface errors otherwise.
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

  /** Replace the style text and record an undo step. */
  function loadText(newText: string) {
    setPast((p) => [...p, text].slice(-HISTORY_MAX));
    setFuture([]);
    setText(newText);
  }

  function handleReset() {
    clearSavedStyle();
    fetchStyleText(DEFAULT_STYLE_URL).then(loadText).catch(() => loadText(FALLBACK_TEXT));
  }

  // UI / Images / quick-edit changes already produce a valid object, so update the
  // parsed style immediately (no input lag) and record an undo step.
  function handleStyleObjectChange(next: StyleSpecification) {
    setPast((p) => [...p, text].slice(-HISTORY_MAX));
    setFuture([]);
    setParsedStyle(next);
    setError(null);
    setText(JSON.stringify(next, null, 2));
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
      const nxt = f[0];
      setPast((p) => [...p, text]);
      setText(nxt);
      return f.slice(1);
    });
  }

  // Keyboard undo/redo, but let Monaco / inputs handle their own when focused.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest(".monaco-editor, input, textarea, [contenteditable=true]")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, past, future]);

  const contrast = checkLabelContrast(parsedStyle);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar
        onLoad={loadText}
        currentText={text}
        onReset={handleReset}
        onUndo={undo}
        onRedo={redo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
      />
      <QuickEditBar style={parsedStyle} onChange={handleStyleObjectChange} contrastLow={!!contrast?.low} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={42} minSize={20}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div className="tabs">
                <button className={"tab" + (tab === "ui" ? " tab--active" : "")} onClick={() => setTab("ui")}>
                  UI
                </button>
                <button className={"tab" + (tab === "json" ? " tab--active" : "")} onClick={() => setTab("json")}>
                  JSON
                </button>
                <button className={"tab" + (tab === "images" ? " tab--active" : "")} onClick={() => setTab("images")}>
                  Images
                </button>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                {tab === "ui" && <UiEditor style={parsedStyle} onChange={handleStyleObjectChange} />}
                {tab === "json" && <StyleEditor value={text} onChange={setText} error={error} />}
                {tab === "images" && <ImagesPanel style={parsedStyle} onChange={handleStyleObjectChange} />}
              </div>
            </div>
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel minSize={20}>
            <MapPreview style={parsedStyle} />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
