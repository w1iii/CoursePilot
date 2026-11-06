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
          <p className="paper-kicker text-accent">{dateLabel}</p>
        </div>
      </div>

      <div className="mt-space-sm flex flex-wrap items-end justify-between gap-space-sm border-t border-primary-container/25 pt-space-sm">
        <div className="min-w-0">
          <p className="font-display text-[22px] leading-tight text-primary-container sm:text-[26px]">
            Magandang araw, {userName}.
          </p>
          <p className="paper-kicker mt-2 text-text-muted md:hidden">
            {dateLabel} · {edition}
          </p>
        </div>

      </div>
    </header>
  );
}
