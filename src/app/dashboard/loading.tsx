import LoadingShell from "./LoadingShell";

export default function DashboardLoading() {
  return (
    <LoadingShell>
      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        <div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col px-gutter-mobile py-space-lg md:px-gutter lg:px-margin-desktop lg:py-space-xl">
          <div className="border-b-[3px] border-primary-container pb-space-sm">
            <div className="h-2 w-28 animate-pulse rounded-none bg-surface-container" />
            <div className="mt-2 h-12 w-40 animate-pulse rounded-none bg-surface-container-high" />
            <div className="mt-space-sm flex items-end justify-between gap-4 border-t border-primary-container/25 pt-space-sm">
              <div className="space-y-2">
                <div className="h-6 w-56 animate-pulse rounded-none bg-surface-container" />
                <div className="h-3 w-40 animate-pulse rounded-none bg-surface-container-low" />
              </div>
              <div className="h-9 w-28 animate-pulse rounded-none bg-primary-container/40" />
            </div>
          </div>

          <div className="mt-space-md grid grid-cols-2 border-y border-primary-container/25 sm:grid-cols-4">
            {[1, 2, 3, 4].map((cell) => (
              <div key={cell} className="border-r border-primary-container/20 px-space-sm py-space-sm last:border-r-0">
                <div className="h-8 w-10 animate-pulse rounded-none bg-surface-container-high" />
                <div className="mt-2 h-2 w-20 animate-pulse rounded-none bg-surface-container" />
              </div>
            ))}
          </div>

          <div className="mt-space-lg grid grid-cols-1 gap-space-lg lg:grid-cols-12 lg:gap-0">
            <div className="space-y-4 lg:col-span-7 lg:pr-space-lg xl:col-span-6">
              <div className="h-2 w-24 animate-pulse rounded-none bg-surface-container" />
              <div className="h-10 w-3/4 animate-pulse rounded-none bg-surface-container-high" />
              <div className="h-4 w-full animate-pulse rounded-none bg-surface-container-low" />
              <div className="h-4 w-2/3 animate-pulse rounded-none bg-surface-container-low" />
              <div className="mt-8 space-y-2 border-t border-border pt-4">
                {[1, 2, 3, 4, 5].map((row) => (
                  <div key={row} className="flex items-center gap-3 border-b border-border py-2">
                    <div className="h-4 w-4 animate-pulse rounded-none bg-surface-container" />
                    <div className="h-3 flex-1 animate-pulse rounded-none bg-surface-container-low" />
                    <div className="h-3 w-14 animate-pulse rounded-none bg-surface-container" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 lg:col-span-5 lg:border-l lg:border-border lg:pl-space-lg xl:col-span-3">
              <div className="h-5 w-32 animate-pulse rounded-none bg-surface-container" />
              {[1, 2, 3].map((item) => (
                <div key={item} className="space-y-2 border-b border-border pb-3">
                  <div className="h-2 w-20 animate-pulse rounded-none bg-surface-container" />
                  <div className="h-3 w-full animate-pulse rounded-none bg-surface-container-low" />
                  <div className="h-3 w-3/4 animate-pulse rounded-none bg-surface-container-low" />
                </div>
              ))}
            </div>

            <div className="space-y-4 lg:col-span-12 lg:grid lg:grid-cols-2 lg:gap-space-lg xl:col-span-3 xl:flex xl:flex-col xl:border-l xl:border-border xl:pl-space-lg">
              <div className="h-40 animate-pulse rounded-none border border-primary-container/30 bg-surface" />
              <div className="space-y-2">
                <div className="h-5 w-28 animate-pulse rounded-none bg-surface-container" />
                {[1, 2, 3].map((row) => (
                  <div key={row} className="h-8 animate-pulse rounded-none bg-surface-container-low" />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-space-xl border-t-[3px] border-primary-container pt-space-md">
            <div className="h-7 w-48 animate-pulse rounded-none bg-surface-container-high" />
            <div className="mt-4 space-y-2">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="grid grid-cols-4 gap-4 border-b border-border py-3">
                  <div className="h-4 w-40 max-w-full animate-pulse rounded-none bg-surface-container-low" />
                  <div className="h-4 w-20 animate-pulse rounded-none bg-surface-container-low" />
                  <div className="h-4 w-16 animate-pulse rounded-none bg-surface-container-low" />
                  <div className="h-4 w-12 animate-pulse rounded-none bg-surface-container" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </LoadingShell>
  );
}
