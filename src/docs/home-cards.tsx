import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { HomeCard } from '@joeblew999/remy-ui/pages';
import { buttonVariants } from '@joeblew999/remy-ui/components/button';
import { docsOrigin } from './origin';

/** The home page's docs cards (HomePage's `cards`): the product guide and the developer docs, each saying who it is for. */
export function docsHomeCards(locale: Locale) {
  const o = { locale };
  return <>
    <HomeCard title={m.nav_guide({}, o)} description={m.home_guide_text({}, o)}>
      <a className={buttonVariants({ variant: 'outline' })} href={`${docsOrigin}/docs`}>{m.nav_guide({}, o)}</a>
    </HomeCard>
    <HomeCard title={m.nav_developers({}, o)} description={m.home_developers_text({}, o)}>
      <a className={buttonVariants({ variant: 'outline' })} href={`${docsOrigin}/dev`}>{m.nav_developers({}, o)}</a>
    </HomeCard>
  </>;
}
