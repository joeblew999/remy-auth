import { redirect } from 'react-router';
import { negotiateLocale } from '../locale';
import type { Route } from './+types/redirect';
export function loader({ request }: Route.LoaderArgs) {
  return redirect(`/${negotiateLocale(request.headers.get('accept-language'))}`,
    { status: 302, headers: { Vary: 'Accept-Language' } });
}
