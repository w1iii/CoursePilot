function LoadingSidebar() {
  return (
    <aside
      aria-hidden="true"
      className="hidden h-full w-[240px] shrink-0 flex-col overflow-hidden border-r border-border bg-surface-container-low md:flex"
    >
      <div className="flex h-14 w-[240px] shrink-0 items-center justify-between border-b border-border px-3">
        <div className="h-6 w-16 animate-pulse rounded bg-surface-container" />
        <div className="h-8 w-8 animate-pulse rounded-lg bg-surface-container" />
      </div>
      <div className="w-[240px] shrink-0 p-2">
        <div className="h-10 w-full animate-pulse rounded-lg bg-primary-container/50" />
      </div>
      <div className="w-[240px] min-h-0 flex-1 px-2">
        <div className="space-y-1">
          {[72, 92, 82].map((width) => (
            <div
              key={width}
              className="h-9 animate-pulse rounded-lg bg-surface-container"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
        <div className="mt-5 h-9 w-full animate-pulse rounded-lg bg-surface" />
        <div className="mt-6 h-3 w-24 animate-pulse rounded bg-surface-container" />
        <div className="mt-3 space-y-2">
          {[88, 70, 80, 62].map((width) => (
            <div
              key={width}
              className="h-9 animate-pulse rounded-lg bg-surface-container-low"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </div>
      <div className="w-[240px] shrink-0 border-t border-border p-2">
        <div className="mb-1 h-8 w-full animate-pulse rounded-lg bg-surface-container" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-secondary-container" />
          <div className="space-y-1">
            <div className="h-3 w-20 animate-pulse rounded bg-surface-container" />
            <div className="h-2 w-28 animate-pulse rounded bg-surface-container" />
          </div>
        </div>
        <div className="mt-1 h-8 w-full animate-pulse rounded-lg bg-surface-container" />
      </div>
    </aside>
  );
}

export default function LoadingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <LoadingSidebar />
      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="ambient-mesh-canvas absolute -inset-[30%] opacity-40" />
          <div className="ambient-woven-dots absolute inset-0 opacity-40" />
        </div>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
