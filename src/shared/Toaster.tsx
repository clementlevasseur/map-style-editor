import { useEffect, useState } from "react";
import { onToast, type Toast } from "@/lib/toast";

export default function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(
    () =>
      onToast((t) => {
        setItems((x) => [...x, t]);
        setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), 4000);
      }),
    [],
  );
  return (
    <div className="toaster">
      {items.map((t) => (
        <div
          key={t.id}
          className={"toast toast--" + t.kind}
          onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
