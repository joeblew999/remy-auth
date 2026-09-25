import { useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { getLocale, type Locale } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';

/**
 * Warns before leaving a page that holds unsaved input, with TanStack Router's `useBlocker`.
 * Returns the setter to pass as DemoPage's `onDirtyChange`: while it was last told `true`, an
 * in-app navigation (a Link, Back or Forward) asks first in the page's language, and a full
 * navigation or closing the tab gets the browser's own leave-page prompt. Once the form reports
 * `false` (a reservation was made), nothing asks.
 */
export function useLeaveGuard(locale: Locale = getLocale()): (dirty: boolean) => void {
  const [dirty, setDirty] = useState(false);
  useBlocker({
    shouldBlockFn: () => !window.confirm(m.leave_unsaved({}, { locale })),
    disabled: !dirty,
    enableBeforeUnload: dirty,
  });
  return setDirty;
}
