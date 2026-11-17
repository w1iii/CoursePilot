import SyncWaitMessages from "./SyncWaitMessages";

export default function SyncLoadingOverlay({ label, showSyncMessages = false }: { label: string; showSyncMessages?: boolean }) {
  return (
    <div
      className="course-sync-overlay"
    >
      <div className="course-sync-spinner" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p role={showSyncMessages ? undefined : "status"}>{label}…</p>
      {showSyncMessages && <SyncWaitMessages />}
    </div>
  );
}
