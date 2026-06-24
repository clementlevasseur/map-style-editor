import { useEffect, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Toolbar from "./components/Toolbar";
import StyleEditor from "./components/StyleEditor";
import UiEditor from "./components/UiEditor";
import MapPreview from "./components/MapPreview";
import { clearSavedStyle, loadSavedStyle, saveStyle } from "./lib/persistence";
import { fetchStyleText } from "./lib/styleLoader";
import { DEFAULT_STYLE_URL, FALLBACK_STYLE } from "./lib/defaultStyle";

const FALLBACK_TEXT = JSON.stringify(FALLBACK_STYLE, null, 2);

export default function App() {
  const [text, setText] = useState<string>("");
  const [parsedStyle, setParsedStyle] = useState<StyleSpecification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"ui" | "json">("ui");

  // Initial load: saved work > default remote style > inline fallback.
  useEffect(() => {
    const saved = loadSavedStyle();
    if (saved) {
      setText(saved);
      return;
    }
    fetchStyleText(DEFAULT_STYLE_URL)
      .then(setText)
      .catch(() => setText(FALLBACK_TEXT));
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

  function handleReset() {
    clearSavedStyle();
    fetchStyleText(DEFAULT_STYLE_URL)
      .then(setText)
      .catch(() => setText(FALLBACK_TEXT));
  }

  // UI editor edits the style object -> re-serialise to keep JSON the source of truth.
  function handleStyleObjectChange(next: StyleSpecification) {
    setText(JSON.stringify(next, null, 2));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar onLoad={setText} currentText={text} onReset={handleReset} />
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
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                {tab === "ui" ? (
                  <UiEditor style={parsedStyle} onChange={handleStyleObjectChange} />
                ) : (
                  <StyleEditor value={text} onChange={setText} error={error} />
                )}
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
