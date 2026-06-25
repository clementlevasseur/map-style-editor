import { useRef, useState } from "react";
import { fetchStyleText, readFileText } from "@/lib/styleLoader";
import { toast } from "@/lib/toast";
import { useDismiss } from "@/shared/useDismiss";
import { GitHubIcon, MoreIcon } from "@/shared/icons";

const REPO_URL = "https://github.com/clementlevasseur/map-style-editor";

interface Props {
  onLoad: (text: string) => void;
  onReset: () => void;
}

export default function MoreMenu({ onLoad, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  async function loadUrl() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      onLoad(await fetchStyleText(url));
      setOpen(false);
    } catch (e) {
      toast(`Failed to load URL: ${e instanceof Error ? e.message : e}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      onLoad(await readFileText(f));
      setOpen(false);
    } catch {
      toast("Failed to read file.", "error");
    }
  }

  return (
    <div className="menu" ref={ref}>
      <button className={"btn btn--icon" + (open ? " btn--primary" : "")} title="More" onClick={() => setOpen((o) => !o)}>
        <MoreIcon />
      </button>
      {open && (
        <div className="menu-pop">
          <div className="menu-row">
            <input
              className="input"
              placeholder="Load from URL…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUrl()}
            />
            <button className="btn" onClick={loadUrl} disabled={busy}>
              {busy ? "…" : "Load"}
            </button>
          </div>
          <button className="menu-action" onClick={() => fileRef.current?.click()}>
            Import file…
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} style={{ display: "none" }} />
          <button className="menu-action" onClick={() => { onReset(); setOpen(false); }}>
            Reset to default style
          </button>
          <a className="menu-action" href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <GitHubIcon size={13} /> View on GitHub
          </a>
        </div>
      )}
    </div>
  );
}
