/// <reference path="./build-virtual.d.ts" />
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { build } from 'virtual:remy-build';
import type { Locale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';
import { useRemyApp } from './app-config';
import { deploymentQuery, sameBuild, shortCommit, type Build } from './build';
import { formatLocale } from './locale-info';
import { Badge } from './components/badge';
import { Button } from './components/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './components/card';

// Which version this is, and what is deployed (remy-sport's build stamp and `ops versions`, for every
// app). Two answers from two places: the page's own build is the stamp it was built with
// (`virtual:remy-build`), and a deployment's is what its Worker answers at /healthz when asked. When
// the page's own deployment answers with another build, the page is running code that has been
// replaced: a tab left open across a deploy. It says so and offers the reload; it never reloads a
// page from under its reader.

const dl = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm';

/** A commit: linked to the source when the app names its repository; `+` marks a build with uncommitted changes. */
function Commit({ locale, stamp, repository }: { locale: Locale; stamp: Pick<Build, 'commit' | 'changes'>; repository?: string }) {
  if (!stamp.commit) return null;
  const short = <code className="tabular-nums">{shortCommit(stamp.commit)}</code>;
  return <span dir="ltr" data-build="commit">
    {repository ? <a className="underline underline-offset-4" href={`${repository}/commit/${stamp.commit}`}>{short}</a> : short}
    {stamp.changes && <abbr className="no-underline" title={m.build_changes({}, { locale })} data-build="changes">+</abbr>}
  </span>;
}

/**
 * One quiet line for a footer or a sidebar: the environment when it is not production (where it is
 * the whole question), the app's name and version, the commit, and the reload control when the
 * deployment has moved on. The name, version and commit are in the server's HTML; the rest arrives
 * when the browser has asked /healthz.
 */
export function BuildStamp({ locale, className = '' }: { locale: Locale; className?: string }) {
  const app = useRemyApp();
  const { data } = useQuery(deploymentQuery());
  const stale = Boolean(data?.build && !sameBuild(data.build, build));
  return <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground ${className}`} data-build-stamp={stale ? 'stale' : 'current'}>
    {data?.environment && data.environment !== 'production' && <Badge variant="outline" data-build="environment">{data.environment}</Badge>}
    <span>{app.brand}{build.app.version && <> <span dir="ltr">{build.app.version}</span></>}</span>
    <Commit locale={locale} stamp={build} repository={app.repository} />
    {stale && <Button size="xs" data-build="reload" onClick={() => window.location.reload()}>{m.build_update({}, { locale })}</Button>}
  </p>;
}

/** Another deployment to list: a name for people, its origin, and its source when its commits can be linked. */
export type ListedDeployment = { name: string; origin: string; repository?: string };

/** What one deployment answers, as label/value rows; `own` fills in what this page already knows about itself. */
function DeploymentCard({ locale, title, origin = '', repository, own }: { locale: Locale; title: string; origin?: string; repository?: string; own?: Build }) {
  const o = { locale };
  const { data, isError } = useQuery(deploymentQuery(origin));
  const stamp = own ?? data?.build;
  const waiting = isError ? m.versions_no_answer({}, o) : '…';
  const header = <CardHeader><CardTitle>{title}</CardTitle></CardHeader>;
  // Another deployment that does not answer has nothing to list: one line says so.
  if (isError && !own) return <Card data-deployment={origin} data-answered="no">{header}
    <CardContent className="text-sm text-muted-foreground">{waiting}</CardContent></Card>;
  return <Card data-deployment={origin || 'own'} data-answered={data ? 'yes' : isError ? 'no' : undefined}>
    {header}
    <CardContent><dl className={dl}>
      <dt className="text-muted-foreground">{m.live_service_label({}, o)}</dt>
      <dd data-version="service"><code>{data?.service ?? waiting}</code></dd>
      <dt className="text-muted-foreground">{m.versions_environment({}, o)}</dt>
      <dd data-version="environment">{data ? data.environment ?? '—' : waiting}</dd>
      {stamp?.app.version && <><dt className="text-muted-foreground">{m.versions_version({}, o)}</dt><dd data-version="version" dir="ltr" className="text-start"><code>{stamp.app.version}</code></dd></>}
      {stamp?.commit && <><dt className="text-muted-foreground">{m.versions_commit({}, o)}</dt><dd data-version="commit" className="text-start"><Commit locale={locale} stamp={stamp} repository={repository} /></dd></>}
      {data?.deployedAt && <><dt className="text-muted-foreground">{m.versions_deployed({}, o)}</dt>
        <dd data-version="deployed"><time dateTime={data.deployedAt}>{new Intl.DateTimeFormat(formatLocale(locale), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.deployedAt))}</time></dd></>}
      <dt className="text-muted-foreground">{m.live_release_label({}, o)}</dt>
      <dd data-version="release" className="[overflow-wrap:anywhere]"><code>{data?.release ?? waiting}</code></dd>
    </dl></CardContent>
  </Card>;
}

/**
 * What is deployed, each part answering for itself: this app, its docs Worker when the app has one
 * (`docs` in defineRemyApp), the app's other deployments (`deployments` there: staging beside
 * production, a service it calls) and any more given here, and the packages this build was made with.
 * For a settings or about page. The others are asked by the browser, so they appear once it has the
 * page; the one this page is served from is "this app" and is not listed twice.
 */
export function Versions({ locale, deployments = [] }: { locale: Locale; deployments?: readonly ListedDeployment[] }) {
  const o = { locale };
  const app = useRemyApp();
  const packages = Object.entries(build.packages);
  const [here, setHere] = useState<string>();
  useEffect(() => setHere(window.location.origin), []);
  const others = here === undefined ? [] : [...(app.deployments ?? []), ...deployments].filter(listed => new URL(listed.origin).origin !== here);
  return <section className="flex flex-col gap-4" aria-labelledby="versions-title" data-versions>
    <h2 id="versions-title" className="text-lg font-medium">{m.versions_title({}, o)}</h2>
    <DeploymentCard locale={locale} title={app.brand} repository={app.repository} own={build} />
    {app.docs && <DeploymentCard locale={locale} title={m.versions_docs({}, o)} origin={app.docs} repository={app.repository} />}
    {others.map(listed => <DeploymentCard key={listed.origin} locale={locale} title={listed.name} origin={listed.origin} repository={listed.repository ?? app.repository} />)}
    {packages.length > 0 && <Card data-version="packages">
      <CardHeader><CardTitle>{m.versions_packages({}, o)}</CardTitle></CardHeader>
      <CardContent><dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
        {packages.map(([name, version]) => <div key={name} className="contents">
          <dt dir="ltr" className="text-start text-muted-foreground [overflow-wrap:anywhere]"><code>{name}</code></dt>
          <dd dir="ltr" className="text-start"><code>{version}</code></dd>
        </div>)}
      </dl></CardContent>
      <CardFooter className="text-sm leading-relaxed text-muted-foreground">{m.versions_note({}, o)}</CardFooter>
    </Card>}
  </section>;
}
