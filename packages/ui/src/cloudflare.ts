export type Place = { country?: string; region?: string; city?: string; timeZone?: string };

/** Cloudflare's request geolocation (`request.cf`) as a plain, validated value. Never log or store it. */
export function placeFromCloudflare(cf: { country?: string; region?: string; city?: string; timezone?: string } | undefined): Place {
  const country = /^[A-Z]{2}$/.test(cf?.country ?? '') ? cf!.country : undefined;
  return { country, region: cf?.region, city: cf?.city, timeZone: cf?.timezone };
}
