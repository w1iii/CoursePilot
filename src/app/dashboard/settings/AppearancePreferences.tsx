"use client";

import { useEffect, useState } from "react";

import { applyTheme, readTheme, THEME_CHANGED_EVENT, type Theme } from "@/lib/theme";
import { isSoundEnabled, setSoundEnabled } from "@/lib/loom-sound";
import SettingsSection, { SettingsRow } from "./SettingsSection";

const SOUND_KEY = "habi:sound-enabled";
const SIDEBAR_KEY = "habi:sidebar-collapsed";

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Preferences remain usable for this session when storage is unavailable.
  }
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container ${
        checked
          ? "border-primary-container bg-primary-container"
          : "border-border bg-surface-container-high"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 rounded-full transition-transform ${
          checked ? "translate-x-6 bg-dark-text" : "translate-x-1 bg-text-muted"
        }`}
      />
    </button>
  );
}

export default function AppearancePreferences() {
  const [sounds, setSounds] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSounds(isSoundEnabled());
    setSidebarCollapsed(readFlag(SIDEBAR_KEY, false));
    setTheme(readTheme());

    const syncTheme = () => setTheme(readTheme());
    window.addEventListener(THEME_CHANGED_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, syncTheme);
  }, []);

  function updateTheme(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  function updateSounds(next: boolean) {
    setSounds(next);
    setDirty(true);
    setSaved(false);
  }

  function updateSidebar(next: boolean) {
    setSidebarCollapsed(next);
    setDirty(true);
    setSaved(false);
  }

  function save() {
    setSoundEnabled(sounds);
    writeFlag(SOUND_KEY, sounds);
    writeFlag(SIDEBAR_KEY, sidebarCollapsed);
    setDirty(false);
    setSaved(true);
  }

  return (
    <SettingsSection
      title="Appearance & accessibility"
      description="Saved on this device. These preferences apply the next time the dashboard loads."
      action={
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent px-3 font-label-md text-label-md text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[16px]">save</span>
          Save changes
        </button>
      }
      footer={
        <p aria-live="polite" className="font-code-tag text-[10px] uppercase tracking-[0.12em] text-text-muted">
          {dirty ? "Unsaved changes" : saved ? "Saved on this device" : "Preferences save on this device"}
        </p>
      }
    >
      <SettingsRow label="Loom sounds" helper="Play the soft loom cue on new chats and actions.">
        <Toggle checked={sounds} label="Loom sounds" onChange={updateSounds} />
      </SettingsRow>
      <SettingsRow
        label="Sidebar starts collapsed"
        helper="Open the dashboard with the chat sidebar tucked away. Shortcut: ⌘/Ctrl+B."
      >
        <Toggle
          checked={sidebarCollapsed}
          label="Start sidebar collapsed"
          onChange={updateSidebar}
        />
      </SettingsRow>
      <SettingsRow label="Density" helper="Compact spacing for task lists." comingSoon>
        <span className="font-label-sm text-label-sm text-text-muted">Comfortable</span>
      </SettingsRow>
      <SettingsRow
        label="Reduce motion"
        helper="Habi already follows your operating system setting."
        comingSoon
      >
        <span className="font-label-sm text-label-sm text-text-muted">System</span>
      </SettingsRow>
      <SettingsRow
        label="Theme"
        helper="Follow your system or pin a mode. Changes apply immediately."
      >
        <div
          role="group"
          aria-label="Theme"
          className="inline-flex overflow-hidden rounded-lg border border-border"
        >
          {(["light", "system", "dark"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateTheme(option)}
              aria-pressed={theme === option}
              className={`px-2.5 py-1.5 font-code-tag text-[10px] uppercase tracking-[0.12em] transition-colors ${
                theme === option
                  ? "bg-accent text-on-accent"
                  : "text-text-muted hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}
