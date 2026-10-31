"use client";

import { useEffect, useState } from "react";
import {
  isSoundEnabled,
  playLoomKnotSound,
  setSoundEnabled,
} from "@/lib/loom-sound";

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  function toggle() {
    const next = !enabled;
    setSoundEnabled(next);
    setEnabled(next);
    if (next) playLoomKnotSound();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute loom sounds" : "Enable loom sounds"}
      title={enabled ? "Mute loom sounds" : "Enable loom sounds"}
      className="hidden items-center gap-space-xs rounded-lg border border-secondary/15 bg-surface px-2.5 py-2 text-text-muted transition-colors hover:text-primary-container xl:inline-flex"
    >
      <span className="material-symbols-outlined text-base leading-none">
        {enabled ? "volume_up" : "volume_off"}
      </span>
      <span className="font-code-tag text-[11px] uppercase tracking-wider">
        {enabled ? "Sound On" : "Muted"}
      </span>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          enabled ? "bg-surface-tint" : "bg-outline-variant"
        }`}
      />
    </button>
  );
}
