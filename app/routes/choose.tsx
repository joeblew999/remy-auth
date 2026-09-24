import { Chooser, chooserData, chooserMeta } from '../chooser';
import type { Route } from './+types/choose';
export function loader({ request }: Route.LoaderArgs) { return chooserData(request, ''); }
export function meta({ loaderData }: Route.MetaArgs) { return chooserMeta(loaderData); }
export default function Choose({ loaderData }: Route.ComponentProps) { return <Chooser {...loaderData} />; }
