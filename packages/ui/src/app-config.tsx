import { createContext, useContext } from 'react';
import type { LinkOptions } from '@tanstack/react-router';
import type { Locale } from './paraglide/runtime.js';

// What an app tells the shared frame about itself (.plans/thin-apps.md, group 1): its name, its source,
// its pages' links and the language worth offering. The frame (shell.tsx, app-shell.tsx, the sidebar and
// the phone's bottom bar) reads it here and names no route of its own beyond '/', which every app has.
// No route imports in this module, so AppProviders and the frame's context cost an app nothing else.

/**
 * One destination in a navigation: where it goes, as TanStack link options the app writes with
 * `linkOptions({ to })` (checked against the app's own routes where it is written), and how the frame shows it.
 */
export type NavItem = {
  link: LinkOptions;
  /** The label, in the page's language. */
  label: (locale: Locale) => string;
  /** The sidebar's and bottom bar's icon (app navigation only). */
  icon?: React.ReactNode;
  /** Also on the phone's bottom bar (app navigation only): three to five core destinations. */
  core?: boolean;
  /** Active on this page only, not its sub-pages (an overview such as /app). */
  exact?: boolean;
};

export type RemyApp = {
  /** The app's name: the site header's and the app frame's brand, page titles, the home page's structured data. */
  brand: string;
  /** The Worker's service name: its log lines, /healthz and the CSP report endpoint's logs. */
  service?: string;
  /** The app's site pages ('' is its home): what its sitemap lists (the seo-routes part). */
  sitePaths: readonly string[];
  /** The app's source: the site header's "GitHub" link. None shows no link. */
  repository?: string;
  /**
   * Where the app's docs Worker answers (its own origin, e.g. from VITE_DOCS_ORIGIN): the site header's
   * "Docs" and "Developers" links and the app sidebar's "Guide". None shows none.
   */
  docs?: string;
  site?: {
    /** The site header's navigation, after the brand. */
    nav?: readonly NavItem[];
    /** More header items the app renders itself (links to another origin, such as its docs), given the page's de-localized path. */
    links?: (path: string, locale: Locale) => React.ReactNode;
  };
  /** The app side (paths under /app, needing JavaScript); an app without one leaves it out and gets no "Open app". */
  app?: {
    /** The app's home: the header's "Open app", the frame's brand link, pages' back links. */
    home: LinkOptions;
    /** The sidebar's pages, in order; `core` ones are the phone's bottom bar too. */
    nav: readonly NavItem[];
    /** More sidebar footer items the app renders itself, above "Back to the site". */
    links?: (locale: Locale) => React.ReactNode;
  };
};

let registered: RemyApp | undefined;

/**
 * Declares the app's frame settings; the app passes them to AppProviders. Link options stay checked where
 * they are written. Also registers them for what runs outside React (pageHead's titles, the shared CSP
 * report route): the root route imports the app's config, so it is registered before any page's head runs.
 */
export const defineRemyApp = (app: RemyApp) => (registered = app);

/** The app's settings as registered by defineRemyApp, if it has run. */
export const registeredApp = () => registered;

const RemyAppContext = createContext<RemyApp>({ brand: 'Remy', sitePaths: [''] });
const PreferredContext = createContext<Locale | undefined>(undefined);

export const RemyAppProvider = RemyAppContext.Provider;
export const PreferredProvider = PreferredContext.Provider;

/** The app's frame settings, from AppProviders. */
export const useRemyApp = () => useContext(RemyAppContext);

/** The language worth offering on this page, from AppProviders (the root loader's `preferred`). */
export const usePreferredLocale = () => useContext(PreferredContext);

/** A NavItem's link options for Link, and its rule for matchRoute (sub-pages count unless `exact`). */
export function navLink({ link, exact }: NavItem) {
  return { link, match: { ...link, fuzzy: !exact } };
}
