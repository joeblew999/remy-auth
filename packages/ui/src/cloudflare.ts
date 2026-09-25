export type Place = { country?: string; region?: string; city?: string; timeZone?: string; latitude?: number; longitude?: number };

/** Cloudflare's request geolocation (`request.cf`) as a plain, validated value. Never log or store it. */
export function placeFromCloudflare(cf: { country?: string; region?: string; city?: string; timezone?: string; latitude?: string; longitude?: string } | undefined): Place {
  const country = /^[A-Z]{2}$/.test(cf?.country ?? '') ? cf!.country : undefined;
  const latitude = coordinate(cf?.latitude, 90);
  const longitude = coordinate(cf?.longitude, 180);
  return { country, region: cf?.region, city: cf?.city, timeZone: cf?.timezone, ...(latitude !== undefined && longitude !== undefined ? { latitude, longitude } : {}) };
}

function coordinate(value: string | undefined, limit: number) {
  const number = Number(value);
  return value && Number.isFinite(number) && Math.abs(number) <= limit ? number : undefined;
}
