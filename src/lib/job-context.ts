import { AsyncLocalStorage } from "node:async_hooks";

// Only dedicated workers use asynchronous RAG ingestion; legacy/admin callers
// retain their existing request contract.
export const jobContext = new AsyncLocalStorage<{ id: string; progress: (message: string) => void }>();
