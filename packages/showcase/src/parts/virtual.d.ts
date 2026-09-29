// The modules remyParts() generates for the showcase's parts (the platform's own, and `virtual:remy-parts`
// itself, are @joeblew999/remy-ui's parts/virtual). An entry of a part the app does not list is `undefined`.
/// <reference types="@joeblew999/remy-ui/parts/virtual" />

declare module 'virtual:remy-parts/deferred-place/place' {
  /** Cloudflare's place of the request, as a server function; a loader returns it unawaited. */
  export const getPlace: typeof import('./deferred-place/place').getPlace | undefined;
}

declare module 'virtual:remy-parts/deferred-place/ui' {
  /** Cloudflare's place, streamed into the page (`place` from getPlace); `device` adds the device's own. */
  export const DeferredPlace: typeof import('./deferred-place/ui').DeferredPlace | undefined;
}

declare module 'virtual:remy-parts/status-card/ui' {
  /** The live status card, and the loader of the route that shows it (fills the QueryClient for the server HTML). */
  export const StatusCard: typeof import('./status-card/ui').StatusCard | undefined;
  export const statusCardLoader: typeof import('./status-card/ui').statusCardLoader | undefined;
}

declare module 'virtual:remy-parts/status-card/app' {
  /** The app's status query (src/parts/status-card.ts), for example `orpc.status.queryOptions()`. */
  export const statusQuery: import('./status-card/query').StatusQuery | undefined;
}

declare module 'virtual:remy-parts/time-zones/app' {
  /** The app's page above a zone in the breadcrumb (src/parts/time-zones.ts), written with linkOptions; none shows none. */
  export const parent: import('@joeblew999/remy-ui/app-config').NavItem | undefined;
}
