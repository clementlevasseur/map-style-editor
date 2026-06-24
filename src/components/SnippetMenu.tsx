import { useState } from "react";
import { SNIPPETS, STYLE_URL_PLACEHOLDER } from "../lib/snippets";
import { CodeIcon } from "./icons";

export default function SnippetMenu() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(STYLE_URL_PLACEHOLDER);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(id: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard blocked — ignore
    }
  }

  return (
    <div className="menu">
      <button
        className={"btn" + (open ? " btn--primary" : "")}
        onClick={() => setOpen((o) => !o)}
        title="Integration snippets"
      >
        <CodeIcon /> Code
      </button>
      {open && (
        <div className="menu-pop menu-pop--wide">
          <div className="menu-row">
            <span className="qh-key">Style URL</span>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="menu-note">Host your exported style.json and paste its URL above.</div>
          {SNIPPETS.map((s) => (
            <div className="snippet" key={s.id}>
              <div className="snippet__head">
                <span>{s.label}</span>
                <button className="btn" onClick={() => copy(s.id, s.code(url))}>
                  {copied === s.id ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="snippet__code">{s.code(url)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
