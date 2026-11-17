import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SyncWaitMessages, { scheduleSyncMessages, SYNC_MESSAGE_INTERVAL_MS, SYNC_WAIT_MESSAGES } from "./SyncWaitMessages";
import SyncLoadingOverlay from "./SyncLoadingOverlay";

afterEach(() => vi.useRealTimers());

describe("sync wait messages", () => {
  it("shows a wait notice and an accessible initial message", () => {
    const html = renderToStaticMarkup(<SyncWaitMessages />);
    expect(html).toContain("This may take several minutes");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(SYNC_WAIT_MESSAGES[0]);
  });

  it("advances messages and stops at the long-wait notice", () => {
    vi.useFakeTimers();
    const update = vi.fn();
    scheduleSyncMessages(update);
    vi.advanceTimersByTime(SYNC_MESSAGE_INTERVAL_MS * 5);
    expect(update.mock.calls).toEqual([[1], [2]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans up the timer when the wait screen closes", () => {
    vi.useFakeTimers();
    const update = vi.fn();
    const cleanup = scheduleSyncMessages(update);
    cleanup();
    vi.advanceTimersByTime(SYNC_MESSAGE_INTERVAL_MS * 5);
    expect(update).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("only adds Canvas wait messages when requested", () => {
    expect(renderToStaticMarkup(<SyncLoadingOverlay label="Syncing Canvas" showSyncMessages />)).toContain(SYNC_WAIT_MESSAGES[0]);
    const studyPack = renderToStaticMarkup(<SyncLoadingOverlay label="Preparing your study pack" />);
    expect(studyPack).not.toContain(SYNC_WAIT_MESSAGES[0]);
    expect(studyPack).toContain('role="status"');
  });
});
