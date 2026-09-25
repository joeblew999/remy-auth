import { Link } from '@tanstack/react-router';
import { PanelLeftIcon } from 'lucide-react';
import type { Locale } from '../../paraglide/runtime.js';
import { m } from '../../paraglide/messages.js';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '../../components/breadcrumb';
import { Button } from '../../components/button';
import { Separator } from '../../components/separator';
import { useSidebar } from '../../components/sidebar';
import { LanguageMenu } from '../../language';

/** sidebar-16's SiteHeader: the sidebar toggle, the breadcrumb with the app's name, and the language menu where the block has its search form. */
export function SiteHeader({ locale, path }: { locale: Locale; path: string }) {
  const { toggleSidebar } = useSidebar();
  return (
    <header className="site-header sticky top-0 z-50 flex w-full items-center border-b bg-background">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button className="h-8 w-8" variant="ghost" size="icon" onClick={toggleSidebar} aria-label={m.toggle_sidebar({}, { locale })}>
          <PanelLeftIcon className="rtl:rotate-180" />
        </Button>
        <Separator orientation="vertical" className="me-2 data-vertical:h-4 data-vertical:self-auto" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className="brand" render={<Link to="/app" preload="intent" />}>Remy</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ms-auto"><LanguageMenu locale={locale} /></div>
      </div>
    </header>
  );
}
