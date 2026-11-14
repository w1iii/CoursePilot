"use client";

const crossings = Array.from({ length: 16 }, (_, index) => ({
  row: Math.floor(index / 4),
  column: index % 4,
  patch: (Math.floor(index / 4) + (index % 4)) % 2 === 0 ? "a" : "b",
}));

export default function LoadingLoom({ label }: { label: string }) {
  return (
    <div className="loading-loom-backdrop" role="status" aria-live="polite" aria-label={label}>
      <div className="loading-loom-wrap">
        <div className="loading-loom" aria-hidden="true">
          {[0, 1, 2, 3].map((column) => <div key={`warp-${column}`} className="loading-loom-warp" style={{ "--c": column } as React.CSSProperties} />)}
          {[0, 1, 2, 3].map((row) => <div key={`weft-${row}`} className={`loading-loom-weft${row % 2 ? " alt" : ""}`} style={{ "--r": row } as React.CSSProperties} />)}
          {crossings.map(({ row, column, patch }) => (
            <div key={`${row}-${column}`} className={`loading-loom-patch ${patch}`} style={{ "--r": row, "--c": column } as React.CSSProperties} />
          ))}
        </div>
        <div className="loading-loom-label">{label}<span>.</span><span>.</span><span>.</span></div>
      </div>
    </div>
  );
}
