export default function SyncLoadingOverlay({ label }: { label: string }) {
  return (
    <div
      className="course-sync-overlay"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="course-sync-spinner" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p>{label}…</p>
    </div>
  );
}
