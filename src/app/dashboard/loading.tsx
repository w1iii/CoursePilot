import LoadingShell from "./LoadingShell";

export default function DashboardLoading() {
  return (
    <LoadingShell>
      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-space-xl px-gutter-mobile py-space-xl md:px-gutter lg:px-margin-desktop lg:py-space-2xl">
          <div className="space-y-3">
            <div className="h-3 w-24 animate-pulse rounded bg-surface-container" />
            <div className="h-9 w-56 animate-pulse rounded bg-surface-container-high" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded bg-surface-container-low" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-container" />
              <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-container" />
            </div>
            <div className="h-9 w-28 animate-pulse rounded-lg bg-primary-container/50" />
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="grid grid-cols-3 gap-4 border-b border-border bg-surface-container-low px-4 py-3">
              {[80, 96, 64].map((width) => (
                <div key={width} className="h-3 animate-pulse rounded bg-surface-container" style={{ width }} />
              ))}
            </div>
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="grid grid-cols-3 gap-4 px-4 py-5">
                  <div className="h-4 w-40 max-w-full animate-pulse rounded bg-surface-container-low" />
                  <div className="h-4 w-24 animate-pulse rounded bg-surface-container-low" />
                  <div className="h-4 w-16 animate-pulse rounded bg-surface-container-low" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </LoadingShell>
  );
}
