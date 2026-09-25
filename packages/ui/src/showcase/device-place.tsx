import { useState } from 'react';
import type { Locale } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { Button } from '../components/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/card';
import { Row } from '../pages';
import { formatLocale } from '../locale-info';

// The device's own location, from the browser's Geolocation API. Following privacy-by-design
// guidance: the card says why and where the data goes before asking, the browser asks only when
// the visitor presses the button, and the coordinates never leave the page. Works on prerendered
// pages too, since it needs no request. The Worker's Permissions-Policy allows geolocation for
// this origin only.

type Coordinates = { latitude: number; longitude: number };
type State =
  | { status: 'idle' | 'asking' | 'denied' | 'unavailable' | 'unsupported' }
  | ({ status: 'shown'; accuracy: number } & Coordinates);

/** Great-circle distance in kilometres (haversine, mean Earth radius). */
export function distanceKm(a: Coordinates, b: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const h = Math.sin(radians(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Formatters the card and its checks share, so both agree on every locale's output. */
export const devicePlaceFormat = {
  degrees: (locale: string, value: number) => new Intl.NumberFormat(formatLocale(locale as Locale), { style: 'unit', unit: 'degree', maximumFractionDigits: 4 }).format(value),
  accuracy: (locale: string, metres: number) => metres < 1000
    ? new Intl.NumberFormat(formatLocale(locale as Locale), { style: 'unit', unit: 'meter', maximumFractionDigits: 0 }).format(metres)
    : new Intl.NumberFormat(formatLocale(locale as Locale), { style: 'unit', unit: 'kilometer', maximumFractionDigits: 1 }).format(metres / 1000),
  distance: (locale: string, km: number) => new Intl.NumberFormat(formatLocale(locale as Locale), { style: 'unit', unit: 'kilometer', maximumFractionDigits: km < 10 ? 1 : 0 }).format(km),
};

/** `network` is Cloudflare's location of the request, when the page has one, to show how far apart the two are. */
export function DevicePlace({ locale, network }: { locale: Locale; network?: Partial<Coordinates> }) {
  const o = { locale };
  const [state, setState] = useState<State>({ status: 'idle' });
  function ask() {
    if (!('geolocation' in navigator)) return setState({ status: 'unsupported' });
    setState({ status: 'asking' });
    navigator.geolocation.getCurrentPosition(
      position => setState({ status: 'shown', latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
      error => setState({ status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  }
  const message = { idle: '', asking: m.device_place_asking({}, o), denied: m.device_place_denied({}, o), unavailable: m.device_place_unavailable({}, o), unsupported: m.device_place_unsupported({}, o), shown: '' }[state.status];
  const from = network?.latitude !== undefined && network.longitude !== undefined ? network as Coordinates : undefined;
  return <Card data-showcase="device-place">
    <CardHeader><CardTitle>{m.device_place_heading({}, o)}</CardTitle></CardHeader>
    <CardContent className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">{m.device_place_note({}, o)}</p>
      <div><Button variant="outline" onClick={ask} disabled={state.status === 'asking'}>{m.device_place_button({}, o)}</Button></div>
      <p role="status" className="min-h-5 text-sm">{message}</p>
      {state.status === 'shown' && <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm">
        <Row sample="device-latitude" label={m.latitude_label({}, o)} data-value={state.latitude}>{devicePlaceFormat.degrees(locale, state.latitude)}</Row>
        <Row sample="device-longitude" label={m.longitude_label({}, o)} data-value={state.longitude}>{devicePlaceFormat.degrees(locale, state.longitude)}</Row>
        <Row sample="device-accuracy" label={m.accuracy_label({}, o)} data-value={state.accuracy}>{devicePlaceFormat.accuracy(locale, state.accuracy)}</Row>
        {from && <Row sample="device-distance" label={m.network_distance_label({}, o)} data-latitude={from.latitude} data-longitude={from.longitude}>{devicePlaceFormat.distance(locale, distanceKm(from, state))}</Row>}
      </dl>}
    </CardContent>
  </Card>;
}
