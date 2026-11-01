import LoadingShell from "./LoadingShell";

export default function DashboardLoading() {
  return (
    <LoadingShell>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-center px-gutter-mobile py-space-xl md:px-gutter lg:py-space-2xl">
          <section aria-label="Loading new chat" className="flex w-full max-w-[900px] flex-col items-center">
            <div className="grid w-full max-w-[820px] items-center gap-space-sm sm:grid-cols-[minmax(220px,300px)_1fr]">
              <div className="flex items-center justify-center">
                <div className="h-36 w-36 animate-pulse rounded-full border border-border bg-surface-container-low sm:h-44 sm:w-44" />
              </div>
              <div className="space-y-3 text-center sm:text-left">
                <div className="mx-auto h-4 w-28 animate-pulse rounded bg-surface-container sm:mx-0" />
                <div className="mx-auto h-10 w-72 max-w-full animate-pulse rounded bg-surface-container-high sm:mx-0" />
              </div>
            </div>
            <div className="mt-space-xl min-h-[112px] w-full max-w-[740px] animate-pulse rounded-[24px] border border-border bg-surface shadow-[0_8px_28px_rgba(21,55,13,0.06)]">
              <div className="h-[68px] w-full rounded-t-[24px] bg-surface-container-low/60" />
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-surface-container" />
                <div className="flex items-center gap-3">
                  <div className="h-7 w-24 rounded bg-surface-container" />
                  <div className="h-9 w-9 rounded-full bg-outline-variant" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex w-full max-w-[740px] flex-wrap justify-center gap-2">
              {[96, 128, 104, 120].map((width) => (
                <div key={width} className="h-9 animate-pulse rounded-full bg-surface-container" style={{ width }} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </LoadingShell>
  );
}
