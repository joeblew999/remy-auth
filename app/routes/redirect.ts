import { redirectToLocalized } from '@joeblew999/remy-ui/react-router';
import type { Route } from './+types/redirect';
/** A URL without a locale goes to the visitor's language (remembered choice, Accept-Language, else the base locale). */
export function loader({ request }: Route.LoaderArgs) { return redirectToLocalized(request); }
