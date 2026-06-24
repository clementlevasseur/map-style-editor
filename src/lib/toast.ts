export type ToastKind = "info" | "success" | "error";
export interface Toast {
  id: number;
  msg: string;
  kind: ToastKind;
}

type Listener = (t: Toast) => void;
const listeners = new Set<Listener>();
let seq = 0;

export function onToast(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function toast(msg: string, kind: ToastKind = "info"): void {
  const t = { id: ++seq, msg, kind };
  listeners.forEach((l) => l(t));
}
