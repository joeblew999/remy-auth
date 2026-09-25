import { createContext, useContext, useEffect, useState } from 'react';
import { ScriptOnce } from '@tanstack/react-router';
import { MoonIcon, SunIcon } from 'lucide-react';
import type { Locale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';
import { Button } from './components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from './components/dropdown-menu';

// shadcn's dark mode for TanStack Start (ui.shadcn.com/docs/dark-mode/tanstack-start): ThemeProvider
// and ModeToggle as the docs write them; the toggle uses Base UI's render prop and localized labels.

type Theme = 'dark' | 'light' | 'system';
type ThemeProviderState = { theme: Theme; setTheme: (theme: Theme) => void };

function getThemeScript(storageKey: string, defaultTheme: Theme) {
  const key = JSON.stringify(storageKey);
  const fallback = JSON.stringify(defaultTheme);
  return `(function(){try{var t=localStorage.getItem(${key});if(t!=='light'&&t!=='dark'&&t!=='system'){t=${fallback}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`;
}

const ThemeProviderContext = createContext<ThemeProviderState>({ theme: 'system', setTheme: () => {} });

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  const resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'theme' }: { children: React.ReactNode; defaultTheme?: Theme; storageKey?: string }) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    setThemeState(stored === 'light' || stored === 'dark' || stored === 'system' ? stored : defaultTheme);
    setMounted(true);
  }, [defaultTheme, storageKey]);
  useEffect(() => { if (mounted) applyTheme(theme); }, [theme, mounted]);
  useEffect(() => {
    if (!mounted || theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme, mounted]);
  const setTheme = (next: Theme) => { localStorage.setItem(storageKey, next); setThemeState(next); };
  return <ThemeProviderContext value={{ theme, setTheme }}>
    <ScriptOnce>{getThemeScript(storageKey, defaultTheme)}</ScriptOnce>
    {children}
  </ThemeProviderContext>;
}

export function useTheme() {
  return useContext(ThemeProviderContext);
}

/** shadcn's ModeToggle: Light, Dark and System in a DropdownMenu (a radio group, so the current choice shows). */
export function ModeToggle({ locale }: { locale: Locale }) {
  const { theme, setTheme } = useTheme();
  const o = { locale };
  return <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} aria-label={m.theme_toggle({}, o)} className="theme-toggle">
      <SunIcon className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <MoonIcon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup value={theme} onValueChange={value => setTheme(value as Theme)}>
        <DropdownMenuRadioItem value="light">{m.theme_light({}, o)}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark">{m.theme_dark({}, o)}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system">{m.theme_system({}, o)}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
