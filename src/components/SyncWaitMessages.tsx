"use client";

import { useEffect, useState } from "react";

export const SYNC_WAIT_MESSAGES = [
  "Your courses and materials are being processed.",
  "Please wait while Coursa works with your Canvas data.",
  "Still working — larger courses may take longer.",
];

export const SYNC_MESSAGE_INTERVAL_MS = 10000;

export function scheduleSyncMessages(update: (index: number) => void) {
  let index = 0;
  const timer = setInterval(() => {
    index = Math.min(index + 1, SYNC_WAIT_MESSAGES.length - 1);
    update(index);
    if (index === SYNC_WAIT_MESSAGES.length - 1) clearInterval(timer);
  }, SYNC_MESSAGE_INTERVAL_MS);
  return () => clearInterval(timer);
}

export default function SyncWaitMessages() {
  const [index, setIndex] = useState(0);

  useEffect(() => scheduleSyncMessages(setIndex), []);

  return (
    <div className="sync-wait-messages">
      <p>This may take several minutes, depending on your courses. Please keep this page open.</p>
      <p role="status" aria-live="polite" aria-atomic="true">{SYNC_WAIT_MESSAGES[index]}</p>
    </div>
  );
}
