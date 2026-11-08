const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isThreadId(value: string | undefined): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Keep draft identity in URL; server renders must not mint a second ID. */
export function newThreadHref(
  id: string,
  params: { q?: string; course?: string },
): string {
  const search = new URLSearchParams({ tid: id });
  if (params.q) search.set("q", params.q);
  if (params.course) search.set("course", params.course);
  return `/dashboard/thread?${search.toString()}`;
}
