function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-sm backdrop-blur-sm">
      <div className="mb-4 h-5 w-40 animate-pulse rounded bg-surface-container" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="h-4 animate-pulse rounded bg-surface-container-low"
            style={{ width: `${90 - index * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <main className="relative z-10 mx-auto w-full max-w-[1120px] px-gutter-mobile py-10 md:px-gutter">
      <div className="grid grid-cols-1 items-center gap-space-2xl lg:grid-cols-12">
        <div className="space-y-space-md lg:col-span-6">
          <div className="h-4 w-52 animate-pulse rounded bg-surface-container" />
          <div className="h-14 w-80 max-w-full animate-pulse rounded bg-surface-container-high" />
          <div className="h-6 w-64 animate-pulse rounded bg-surface-container" />
          <div className="flex flex-wrap gap-2 pt-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-9 w-44 animate-pulse rounded-xl bg-surface-container"
              />
            ))}
          </div>
        </div>
        <div className="lg:col-span-6">
          <div className="mx-auto h-[320px] w-[320px] max-w-full animate-pulse rounded-full border border-border bg-surface-container-low/60" />
        </div>
      </div>

      <div className="mt-8 h-[60px] animate-pulse rounded-2xl border border-border bg-surface-container-low" />

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>

      <div className="mt-8 h-40 animate-pulse rounded-2xl border border-border bg-surface-container-low" />
    </main>
  );
}
