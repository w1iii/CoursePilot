export const SESSION_EXPIRED = "Your session expired. Sign in again to continue.";

export function syncErrorMessage(status: number): string {
  switch (status) {
    case 401: return SESSION_EXPIRED;
    case 400: return "Canvas is not connected. Connect Canvas in Settings before syncing.";
    case 409: return "A sync is already running. Please try again shortly.";
    case 429: return "Too many requests. Please wait before trying again.";
    case 503: return "Sync is temporarily unavailable. Please try again later.";
    default: return "Sync could not be completed. Please try again.";
  }
}
