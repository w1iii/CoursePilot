import LoadingShell from "../LoadingShell";

export default function ThreadLoading() {
  return (
    <LoadingShell>
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-container" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-surface-container" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8 md:px-6">
            <div className="self-end space-y-2">
              <div className="h-12 w-64 animate-pulse rounded-2xl bg-secondary-container/60" />
              <div className="ml-auto h-3 w-16 animate-pulse rounded bg-surface-container" />
            </div>
            <div className="max-w-[85%] space-y-3">
              <div className="h-4 w-20 animate-pulse rounded bg-surface-container" />
              <div className="h-4 w-full animate-pulse rounded bg-surface-container-low" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-surface-container-low" />
              <div className="h-4 w-3/5 animate-pulse rounded bg-surface-container-low" />
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-border bg-background px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 md:px-6">
          <div className="mx-auto h-[112px] w-full max-w-[720px] animate-pulse rounded-[24px] border border-border bg-surface">
            <div className="h-[68px] rounded-t-[24px] bg-surface-container-low/60" />
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <div className="h-8 w-8 rounded-full bg-surface-container" />
              <div className="flex items-center gap-3">
                <div className="h-7 w-24 rounded bg-surface-container" />
                <div className="h-9 w-9 rounded-full bg-outline-variant" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </LoadingShell>
  );
}
