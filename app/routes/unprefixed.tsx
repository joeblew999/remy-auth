import { Chooser, chooserData, chooserMeta } from '../chooser';
import { publicPaths } from '../paths';
import type { Route } from './+types/unprefixed';
/** The language chooser for a public path without a locale. */
export function loader({ request }: Route.LoaderArgs) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  if (!publicPaths.includes(path)) throw new Response('Not found', { status: 404 });
  return chooserData(request, path);
}
export function meta({ loaderData }: Route.MetaArgs) { return chooserMeta(loaderData); }
export default function Unprefixed({ loaderData }: Route.ComponentProps) { return <Chooser {...loaderData} />; }
