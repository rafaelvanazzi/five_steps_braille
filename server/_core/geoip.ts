/**
 * Geolocation helper using ip-api.com (free tier, no API key required).
 * Returns country, countryCode, regionName, and city for a given IP.
 * Falls back gracefully if the service is unavailable or IP is private.
 */

interface GeoResult {
  country: string | null;
  countryCode: string | null;
  regionName: string | null;
  city: string | null;
}

const PRIVATE_IP_REGEX = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$|fc|fd)/;

export async function getGeoFromIp(ip: string): Promise<GeoResult | null> {
  if (!ip || PRIVATE_IP_REGEX.test(ip)) {
    // Private/loopback IP — skip lookup (common in local dev)
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json() as {
      status: string;
      country?: string;
      countryCode?: string;
      regionName?: string;
      city?: string;
    };

    if (data.status !== "success") return null;

    return {
      country: data.country ?? null,
      countryCode: data.countryCode ?? null,
      regionName: data.regionName ?? null,
      city: data.city ?? null,
    };
  } catch {
    // Timeout or network error — fail silently
    return null;
  }
}

/**
 * Extract the real client IP from an Express request,
 * respecting X-Forwarded-For headers set by proxies/load balancers.
 */
export function getClientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  return req.ip ?? "";
}
