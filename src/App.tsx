import { lazy, Suspense, useEffect, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Toolbar from "@/features/toolbar/Toolbar";
import UiEditor from "@/features/layers/UiEditor";
import ImagesPanel from "@/features/images/ImagesPanel";
import MapPreview from "@/features/map/MapPreview";
import QuickEditBar from "@/features/quick-edit/QuickEditBar";
import BrandPanel from "@/features/palette/BrandPanel";
import ConfigurePanel from "@/features/configurator/ConfigurePanel";
import CommandPalette from "@/features/command-palette/CommandPalette";
import Toaster from "@/shared/Toaster";
import { CodeIcon, ImageIcon, LayersIcon, PaletteIcon, SlidersIcon } from "@/shared/icons";
import { useStyleDocument } from "@/app/useStyleDocument";
import { useHistory } from "@/app/useHistory";
import { useMediaQuery } from "@/app/useMediaQuery";
import { clearSavedStyle } from "@/lib/persistence";
import { checkLabelContrast } from "@/lib/contrast";
import { toast } from "@/lib/toast";

// Monaco is heavy and bundled locally — load the JSON editor on demand.
const StyleEditor = lazy(() => import("@/features/code/StyleEditor"));

const SECTIONS = [
  { id: "configure", label: "Setup", icon: <SlidersIcon /> },
  { id: "layers", label: "Layers", icon: <LayersIcon /> },
  { id: "palette", label: "Palette", icon: <PaletteIcon /> },
  { id: "images", label: "Images", icon: <ImageIcon /> },
  { id: "code", label: "Code", icon: <CodeIcon size={18} /> },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export default function App() {
  const { text, parsedStyle, error, setText, setStyleObject, loadDefault } = useStyleDocument();
  const { record, undo, redo, canUndo, canRedo } = useHistory(text, setText);
  const vertical = useMediaQuery("(max-width: 820px)");
  const [section, setSection] = useState<SectionId>(
    () => (localStorage.getItem("map-style-editor:section") as SectionId) || "configure",
  );
  // A layer picked by clicking the map (n forces re-selection on repeat clicks).
  const [pickedLayer, setPickedLayer] = useState<{ id: string; n: number } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number; n: number } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  function handlePickLayer(id: string) {
    setSection("layers");
    setPickedLayer((prev) => ({ id, n: (prev?.n ?? 0) + 1 }));
    toast(`Selected layer “${id}”`);
  }

  function handleGoTo(center: [number, number], zoom: number) {
    setFlyTarget((prev) => ({ center, zoom, n: (prev?.n ?? 0) + 1 }));
  }

  // ⌘K / Ctrl+K toggles the command palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("map-style-editor:section", section);
    } catch {
      /* ignore */
    }
  }, [section]);

  /** Replace the whole text (template / import / share) with an undo step. */
  function loadText(next: string) {
    record();
    setText(next);
  }

  /** Apply an edited style object (UI / quick edit / palette) with an undo step. */
  function applyStyle(next: StyleSpecification) {
    record();
    setStyleObject(next);
  }

  function handleReset() {
    record();
    clearSavedStyle();
    loadDefault();
  }

  const contrastLow = !!checkLabelContrast(parsedStyle)?.low;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar
        onLoad={loadText}
        currentText={text}
        onReset={handleReset}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        styleName={(parsedStyle as { name?: string } | null)?.name ?? ""}
        onRename={(name) => parsedStyle && applyStyle({ ...parsedStyle, name } as StyleSpecification)}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <QuickEditBar style={parsedStyle} onChange={applyStyle} contrastLow={contrastLow} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <PanelGroup direction={vertical ? "vertical" : "horizontal"} autoSaveId={vertical ? "mse-split-v" : "mse-split-h"}>
          <Panel defaultSize={vertical ? 42 : 36} minSize={20}>
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
                {section === "configure" && <ConfigurePanel style={parsedStyle} onChange={applyStyle} />}
                {section === "layers" && <UiEditor style={parsedStyle} onChange={applyStyle} selectLayer={pickedLayer} />}
                {section === "palette" && <BrandPanel style={parsedStyle} onChange={applyStyle} />}
                {section === "images" && <ImagesPanel style={parsedStyle} onChange={applyStyle} />}
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
            <MapPreview style={parsedStyle} onPickLayer={handlePickLayer} flyTo={flyTarget} />
          </Panel>
        </PanelGroup>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        style={parsedStyle}
        onApplyStyle={applyStyle}
        onGoTo={handleGoTo}
        onSelectLayer={handlePickLayer}
        onSection={setSection}
        onUndo={undo}
        onRedo={redo}
        onReset={handleReset}
      />
      <Toaster />
    </div>
  );
}
