import { useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { MAPLIBRE_STYLE_SCHEMA, STYLE_SPEC_VERSION } from "../lib/styleSchema";

interface StyleEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** JSON parse error from the app (hard syntax failure). */
  error: string | null;
}

export default function StyleEditor({ value, onChange, error }: StyleEditorProps) {
  const [issueCount, setIssueCount] = useState<number | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  function handleMount(editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) {
    // Register the generated MapLibre schema for autocompletion + hover docs.
    // Schema-based error reporting is disabled ("ignore") to avoid false
    // positives on expressions; authoritative errors come from validateStyleMin.
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      trailingCommas: "error",
      schemaValidation: "ignore",
      enableSchemaRequest: false,
      schemas: [
        {
          uri: "https://maplibre.org/maplibre-style-spec/schema.json",
          fileMatch: ["*"],
          schema: MAPLIBRE_STYLE_SCHEMA,
        },
      ],
    });

    const runValidation = () => {
      const model = editor.getModel();
      if (!model) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(model.getValue());
      } catch {
        // Monaco shows JSON syntax errors itself; clear our spec markers.
        monaco.editor.setModelMarkers(model, "maplibre-spec", []);
        setIssueCount(null);
        return;
      }
      let errors: { message: string; line?: number }[] = [];
      try {
        errors = (validateStyleMin(parsed as never) as never[]) ?? [];
      } catch {
        errors = [];
      }
      const markers = errors.map((e) => {
        const line = e.line && e.line > 0 ? e.line : 1;
        return {
          severity: monaco.MarkerSeverity.Error,
          message: e.message,
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: model.getLineMaxColumn(line),
        };
      });
      monaco.editor.setModelMarkers(model, "maplibre-spec", markers);
      setIssueCount(markers.length);
    };

    runValidation();
    editor.onDidChangeModelContent(() => {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(runValidation, 350);
    });
  }

  let footer: React.ReactNode = null;
  if (error) {
    footer = <div className="statusbar statusbar--error">⚠ Invalid JSON — {error}</div>;
  } else if (issueCount && issueCount > 0) {
    footer = (
      <div className="statusbar statusbar--warn">
        ⚠ {issueCount} spec issue(s) — see the underlined lines
      </div>
    );
  } else if (issueCount === 0) {
    footer = (
      <div className="statusbar statusbar--ok">✓ Valid against MapLibre style spec v{STYLE_SPEC_VERSION}</div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          defaultLanguage="json"
          theme="vs-dark"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            tabSize: 2,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            quickSuggestions: { other: true, comments: false, strings: true },
          }}
        />
      </div>
      {footer}
    </div>
  );
}
