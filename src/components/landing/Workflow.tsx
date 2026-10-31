"use client";

import { useState } from "react";
import { playLoomShuttleGlide } from "@/lib/loom-sound";

const steps = [
  {
    number: "01",
    icon: "vpn_key",
    title: "Connect Canvas",
    body: "Securely link your university Canvas LMS account with a personal access token. We only read assignments and course files — zero password storage.",
    badgeIcon: "verified_user",
    badge: "AES-256-GCM token encryption",
    accentText: "text-surface-tint",
    titleHover: "group-hover:text-surface-tint",
    accentIconBg: "bg-surface-container-high",
    hoverIconBg: "group-hover:bg-primary-container group-hover:text-dark-text",
    topBar: "bg-surface-tint/30 group-hover:bg-surface-tint",
    numberColor: "text-surface-tint",
  },
  {
    number: "02",
    icon: "tune",
    title: "Weave your week",
    body: "Habi unravels upcoming modules, lecture recordings, and problem sets into calibrated, sequential 45-minute focus intervals.",
    badgeIcon: "timelapse",
    badge: "Calibrated to human attention",
    accentText: "text-tertiary",
    titleHover: "group-hover:text-tertiary",
    accentIconBg: "bg-surface-container",
    hoverIconBg: "group-hover:bg-tertiary group-hover:text-on-tertiary",
    topBar: "bg-tertiary-fixed-dim/40 group-hover:bg-tertiary",
    numberColor: "text-tertiary",
  },
  {
    number: "03",
    icon: "self_improvement",
    title: "Follow your calm",
    body: "Wake up to mindful daily briefings, gentle nudges when due dates shift, and finish every week with zero surprise Sunday midnight panic.",
    badgeIcon: "spa",
    badge: "Restful Sunday evenings",
    accentText: "text-surface-tint",
    titleHover: "group-hover:text-primary",
    accentIconBg: "bg-secondary-container",
    hoverIconBg: "group-hover:bg-primary-container group-hover:text-dark-text",
    topBar: "bg-primary-container/20 group-hover:bg-primary-container",
    numberColor: "text-primary-container",
  },
];

export default function Workflow() {
  const [active, setActive] = useState(0);

  return (
    <div className="relative grid grid-cols-1 gap-space-xl md:grid-cols-3">
      {/* Connecting warp strand behind cards */}
      <div className="absolute left-16 right-16 top-8 -z-0 hidden h-0.5 bg-secondary/15 md:block">
        <div
          className="h-full bg-linear-to-r from-surface-tint via-tertiary-fixed-dim to-primary-container transition-all duration-500"
          style={{ opacity: active ? 0.3 + active * 0.25 : 0.4 }}
        />
      </div>

      {steps.map((step, index) => (
        <div
          key={step.number}
          onMouseEnter={() => {
            setActive(index + 1);
            playLoomShuttleGlide(0.1);
          }}
          onMouseLeave={() => setActive(0)}
          className="warp-step-card group relative z-10 flex cursor-pointer flex-col justify-between rounded-xl border border-border bg-surface p-space-xl shadow-sm"
        >
          <div
            className={`absolute left-6 right-6 top-0 h-1 rounded-full transition-colors duration-300 ${step.topBar}`}
          />
          <div>
            <div className="mb-space-lg flex items-center justify-between pt-space-xs">
              <span
                className={`font-display text-headline-md font-bold transition-transform duration-200 group-hover:scale-105 ${step.numberColor}`}
              >
                {step.number}
              </span>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-primary-container transition-colors duration-200 ${step.accentIconBg} ${step.hoverIconBg}`}
              >
                <span className="material-symbols-outlined text-xl leading-none">{step.icon}</span>
              </div>
            </div>
            <h3
              className={`mb-space-xs font-headline-sm text-headline-sm text-primary-container transition-colors ${step.titleHover}`}
            >
              {step.title}
            </h3>
            <p className="font-body-sm text-body-sm leading-relaxed text-text-muted">{step.body}</p>
          </div>
          <div className="mt-space-xl flex items-center gap-space-xs rounded-lg bg-surface-bright/70 p-space-sm pt-space-md text-text-muted transition-colors group-hover:bg-surface-container-low">
            <span className={`material-symbols-outlined text-sm leading-none ${step.accentText}`}>
              {step.badgeIcon}
            </span>
            <span className="font-code-tag text-code-tag">{step.badge}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
