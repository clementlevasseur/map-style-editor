import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Toolbar from "./components/Toolbar";
import UiEditor from "./components/UiEditor";
import ImagesPanel from "./components/ImagesPanel";
import MapPreview from "./components/MapPreview";
import QuickEditBar from "./components/QuickEditBar";
import Toaster from "./components/Toaster";
import BrandPanel from "./components/BrandPanel";
import { CodeIcon, ImageIcon, LayersIcon, PaletteIcon } from "./components/icons";

// Monaco is heavy and bundled locally — load the JSON editor on demand.
const StyleEditor = lazy(() => import("./components/StyleEditor"));
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
  const [section, setSection] = useState<"layers" | "palette" | "images" | "code">(
    () => (localStorage.getItem("map-style-editor:section") as "layers" | "palette" | "images" | "code") || "layers",
  );
  const [past, setPast] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [vertical, setVertical] = useState(() => window.innerWidth < 820);

  useEffect(() => {
    try {
      localStorage.setItem("map-style-editor:section", section);
    } catch {
      /* ignore */
    }
  }, [section]);

  const SECTIONS = [
    { id: "layers", label: "Layers", icon: <LayersIcon /> },
    { id: "palette", label: "Palette", icon: <PaletteIcon /> },
    { id: "images", label: "Images", icon: <ImageIcon /> },
    { id: "code", label: "Code", icon: <CodeIcon size={18} /> },
  ] as const;

  // Stack editor/map vertically on narrow screens.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const handler = () => setVertical(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
        styleName={(parsedStyle as { name?: string } | null)?.name ?? ""}
        onRename={(name) => parsedStyle && handleStyleObjectChange({ ...parsedStyle, name } as StyleSpecification)}
      />
      <QuickEditBar style={parsedStyle} onChange={handleStyleObjectChange} contrastLow={!!contrast?.low} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <PanelGroup direction={vertical ? "vertical" : "horizontal"}>
          <Panel defaultSize={44} minSize={22}>
            <div className="editor-pane">
              <nav className="rail">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    className={"rail-btn" + (section === s.id ? " rail-btn--active" : "")}
                    title={s.label}
                    onClick={() => setSection(s.id)}
                  >
                    {s.icon}
                    <span className="rail-btn__label">{s.label}</span>
                  </button>
                ))}
              </nav>
              <div className="editor-panel">
                {section === "layers" && <UiEditor style={parsedStyle} onChange={handleStyleObjectChange} />}
                {section === "palette" && <BrandPanel style={parsedStyle} onChange={handleStyleObjectChange} />}
                {section === "images" && <ImagesPanel style={parsedStyle} onChange={handleStyleObjectChange} />}
                {section === "code" && (
                  <Suspense fallback={<div className="empty-note">Loading editor…</div>}>
                    <StyleEditor value={text} onChange={setText} error={error} />
                  </Suspense>
                )}
              </div>
            </div>
          </Panel>
          <PanelResizeHandle className={"resize-handle " + (vertical ? "resize-handle--h" : "resize-handle--v")} />
          <Panel minSize={20}>
            <MapPreview style={parsedStyle} />
          </Panel>
        </PanelGroup>
      </div>
      <Toaster />
    </div>
  );
}
