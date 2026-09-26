import { useEffect, useId, useState } from 'react';
import { useTheme } from '@joeblew999/remy-ui/theme';

// Mermaid diagrams in the docs (```mermaid blocks; Fumadocs' remarkMdxMermaid writes <Mermaid chart />),
// as Fumadocs' Mermaid guide renders them: the library loads only on a page that has a diagram, and
// draws in the site's current theme. Without JavaScript the diagram's source shows instead.
export function Mermaid({ chart }: { chart: string }) {
  const id = useId();
  const { theme } = useTheme();
  const [svg, setSvg] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    // The browser only: the guard lets Vite drop the import from the Worker's build (mermaid is ~5 MB).
    if (import.meta.env.SSR) return;
    void import('mermaid').then(async ({ default: mermaid }) => {
      const dark = document.documentElement.classList.contains('dark');
      mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', fontFamily: 'inherit', theme: dark ? 'dark' : 'default' });
      const { svg } = await mermaid.render(id.replaceAll(':', ''), chart.replaceAll('\\n', '\n'));
      if (!cancelled) setSvg(svg);
    });
    return () => { cancelled = true; };
  }, [chart, id, theme]);
  return svg
    ? <div className="my-6 flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
    : <pre className="my-6 overflow-x-auto rounded-lg border p-4 text-sm">{chart}</pre>;
}
