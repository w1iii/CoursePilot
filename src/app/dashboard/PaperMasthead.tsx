import Link from "next/link";
import type { CanvasAccountStatus } from "@/lib/canvas-account";
import SyncButton from "./SyncButton";

interface Props {
  userName: string;
  dateLabel: string;
  edition: string;
  canvas: CanvasAccountStatus;
}

export default function PaperMasthead({
  userName,
  dateLabel,
  edition,
  canvas,
}: Props) {
  const connected = canvas.connected && !canvas.needsReconnect;

  return (
    <header className="border-b-[3px] border-double border-primary-container pb-space-sm">
      <div className="flex flex-wrap items-end justify-between gap-space-sm">
        <div className="hidden text-right md:block">
          <p className="paper-kicker text-primary-container">{dateLabel}</p>
        </div>
      </div>

      <div className="mt-space-sm flex flex-wrap items-end justify-between gap-space-sm border-t border-primary-container/25 pt-space-sm">
        <div className="min-w-0">
          <p className="font-display text-[22px] leading-tight text-primary-container sm:text-[26px]">
            Magandang araw, {userName}.
          </p>
          <p className="mt-0.5 font-body-sm text-body-sm text-text-muted">
            Your semester, set in type.
          </p>
          <p className="paper-kicker mt-2 text-text-muted md:hidden">
            {dateLabel} · {edition}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm">
          <Link
            href="/dashboard/settings#canvas"
            className={`paper-stamp ${connected ? "text-secondary" : "text-error"}`}
            title={
              connected
                ? "Canvas connected"
                : canvas.needsReconnect
                  ? "Canvas token needs reconnecting"
                  : "Canvas not connected"
            }
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {canvas.needsReconnect
              ? "Reconnect Canvas"
              : connected
                ? "Canvas connected"
                : "Connect Canvas"}
          </Link>
          <SyncButton connected={connected} />
        </div>
      </div>
    </header>
  );
}
