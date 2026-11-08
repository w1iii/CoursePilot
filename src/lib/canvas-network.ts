import { promises as dns } from "node:dns";
import { BlockList, isIP } from "node:net";
import { Agent, request } from "undici";

const blockedV4 = new BlockList();
const blockedV6 = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
  ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blockedV4.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [
  ["::", 128], ["::1", 128], ["::ffff:0:0", 96],
  ["64:ff9b::", 96], ["100::", 64], ["2001::", 32],
  ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7],
  ["fe80::", 10], ["ff00::", 8],
] as const) blockedV6.addSubnet(address, prefix, "ipv6");

export function isAllowedCanvasAddress(address: string): boolean {
  const family = isIP(address);
  return family !== 0 && !(family === 4
    ? blockedV4.check(address, "ipv4")
    : blockedV6.check(address, "ipv6"));
}

function localDevelopment(url: URL): boolean {
  return process.env.NODE_ENV !== "production" && url.protocol === "http:" &&
    url.hostname === "localhost";
}

async function pinnedAddress(url: URL): Promise<{ address: string; family: number }> {
  if (url.username || url.password || url.hash || url.protocol !== "https:" && !localDevelopment(url)) {
    throw new Error("Canvas URL must use https without credentials or fragments");
  }
  const results = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (results.length === 0 || results.some(({ address }) =>
    !isAllowedCanvasAddress(address) && !(localDevelopment(url) &&
      (address === "127.0.0.1" || address === "::1")))) {
    throw new Error("Canvas URL resolves to a disallowed address");
  }
  return results[0];
}

/** Check URL for connect; each actual request re-resolves and pins its own IP. */
export async function validateCanvasUrl(baseUrl: string): Promise<void> {
  await pinnedAddress(new URL(baseUrl));
}

/** DNS and socket use same validated IP; redirects never carry credentials. */
export async function canvasRequest(url: string, token: string): Promise<unknown> {
  const target = new URL(url);
  const address = await pinnedAddress(target);
  const agent = new Agent({
    connect: {
      lookup: (hostname, _options, callback) => {
        if (hostname !== target.hostname) {
          callback(new Error("Canvas connection host changed"), "", 4);
        } else {
          callback(null, address.address, address.family);
        }
      },
    },
  });
  try {
    const response = await request(target, {
      dispatcher: agent,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      maxRedirections: 0,
      signal: AbortSignal.timeout(15_000),
    });
    if (response.statusCode === 401 || response.statusCode === 403) {
      await response.body.dump();
      return { status: response.statusCode };
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      await response.body.dump();
      throw new Error(`Canvas API returned HTTP ${response.statusCode}`);
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of response.body) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > 8 * 1024 * 1024) {
        throw new Error("Canvas response exceeds 8 MiB");
      }
      chunks.push(bytes);
    }
    return {
      status: response.statusCode,
      body: JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown,
      link: response.headers.link,
    };
  } finally {
    await agent.close();
  }
}
