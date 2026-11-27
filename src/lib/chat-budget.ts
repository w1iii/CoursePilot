// Total request budgets, not targets for normal chat latency.
export const CHAT_REQUEST_MS = 45_000;
export const CHAT_RAG_MS = 35_000;
export const CHAT_BROWSER_MS = 50_000;
export const CHAT_MAX_ANSWER_CHARS = 8_000;

export function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    work.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}
