/** Try a fresh Clerk token without allowing token refresh to block onboarding. */
export async function saveUsernameRequest(username: string, getToken: () => Promise<string | null>): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let token: string | null = null;
  try {
    token = await Promise.race([
      getToken().catch(() => null),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 3000); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
  return fetch("/api/profile/username", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ username }),
    signal: AbortSignal.timeout(15000),
  });
}
