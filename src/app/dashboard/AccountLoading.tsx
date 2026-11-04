import LoadingShell from "./LoadingShell";

export default function AccountLoading({ profile = false }: { profile?: boolean }) {
  return (
    <LoadingShell>
      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-gutter-mobile py-space-xl md:px-gutter lg:px-margin-desktop lg:py-space-2xl">
          <div className="mb-space-xl shrink-0 space-y-3 rounded-xl p-space-xl">
            <div className="h-3 w-20 animate-pulse rounded bg-surface-container" />
            <div className="h-9 w-48 animate-pulse rounded bg-surface-container-high" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded bg-surface-container-low" />
          </div>
          <div className="mb-space-xl flex shrink-0 items-center gap-1 border-b border-border">
            <div className="h-10 w-28 animate-pulse rounded-t-lg bg-surface-container" />
            <div className="h-10 w-28 animate-pulse rounded-t-lg bg-surface-container-low" />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl p-space-xl">
            {profile ? (
              <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                <div className="h-40 w-40 animate-pulse rounded-full bg-surface-container" />
                <div className="space-y-4">
                  {[220, 320, 260, 300].map((width) => (
                    <div key={width} className="h-10 animate-pulse rounded-lg bg-surface-container-low" style={{ width, maxWidth: "100%" }} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {[260, 340, 300].map((width) => (
                  <div key={width} className="h-12 animate-pulse rounded-lg bg-surface-container-low" style={{ width, maxWidth: "100%" }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </LoadingShell>
  );
}
