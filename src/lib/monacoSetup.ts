// Bundle Monaco locally instead of @monaco-editor/react's default CDN loader —
// enables offline use. Imported only by the lazy-loaded StyleEditor, so it stays
// in its own chunk and never weighs on the initial load.
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import { loader } from "@monaco-editor/react";

(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    return label === "json" ? new jsonWorker() : new editorWorker();
  },
};

loader.config({ monaco });
