import type { MDXComponents } from 'mdx/types';
import { Link } from '@tanstack/react-router';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@joeblew999/remy-ui/components/table';
import { cn } from '../lib/utils';

// How the docs' Markdown tree (view.tsx) renders: stock shadcn pieces (Table) and shadcn's
// typography classes, and links that the router localizes.

/**
 * Links the Markdown carries, as source.config.ts rewrote them: a docs page (/docs/<slug>#hash) is a
 * TanStack Link, localized by the router and preloaded on intent; anything else a plain anchor.
 */
export function DocsLink({ href = '', children, ...props }: React.ComponentProps<'a'>) {
  const match = href.match(/^\/docs(?:\/([^#/]+))?(?:#(.*))?$/);
  if (!match) return <a href={href} {...props}>{children}</a>;
  const [, slug, hash] = match;
  return slug
    ? <Link to="/docs/$slug" params={{ slug }} hash={hash} preload="intent" activeOptions={{ exact: true }} {...props}>{children}</Link>
    : <Link to="/docs" hash={hash} preload="intent" activeOptions={{ exact: true }} {...props}>{children}</Link>;
}

/** An element with shadcn's typography classes, merged with any class the Markdown compiler set (Shiki's on code blocks). */
function styled<T extends 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'ul' | 'ol' | 'blockquote' | 'hr' | 'code'>(Tag: T, classes: string) {
  return ({ className, ...props }: React.ComponentProps<T>) => {
    const Element = Tag as React.ElementType;
    return <Element className={cn(classes, className)} {...props} />;
  };
}

/** shadcn's typography (ui.shadcn.com/docs/components/typography), element by element. */
export const docsComponents: MDXComponents = {
  h1: styled('h1', 'scroll-m-20 text-4xl font-semibold tracking-tight text-balance'),
  h2: styled('h2', 'mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0'),
  h3: styled('h3', 'mt-8 scroll-m-20 text-2xl font-semibold tracking-tight'),
  h4: styled('h4', 'mt-6 scroll-m-20 text-xl font-semibold tracking-tight'),
  p: styled('p', 'leading-7 [&:not(:first-child)]:mt-6'),
  a: ({ className, ...props }) => <DocsLink className={cn('font-medium text-primary underline underline-offset-4', className)} {...props} />,
  ul: styled('ul', 'my-6 ms-6 list-disc [&>li]:mt-2'),
  ol: styled('ol', 'my-6 ms-6 list-decimal [&>li]:mt-2'),
  blockquote: styled('blockquote', 'mt-6 border-s-2 ps-6 italic'),
  hr: styled('hr', 'my-8'),
  code: styled('code', 'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm [pre_&]:bg-transparent [pre_&]:p-0 [pre_&]:font-normal'),
  pre: ({ className, ...props }) =>
    <pre className={cn('my-6 overflow-x-auto rounded-lg border p-4 text-sm', className)} {...props} />,
  table: props => <div className="my-6"><Table {...props} /></div>,
  thead: props => <TableHeader {...props} />,
  tbody: props => <TableBody {...props} />,
  tr: props => <TableRow {...props} />,
  th: props => <TableHead {...props} />,
  td: ({ className, ...props }) => <TableCell className={cn('whitespace-normal', className)} {...props} />,
};
