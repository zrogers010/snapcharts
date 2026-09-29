"use client";

import { useState, type ReactNode } from "react";

export function ExpandablePanelClient({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full px-5 py-3 flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          {title}
        </h2>
        <span
          className={`text-zinc-500 text-xs transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      <div 
        className="px-5 pb-5 pt-1" 
        hidden={!open}
        aria-hidden={!open}
      >
        {children}
      </div>
    </section>
  );
}
