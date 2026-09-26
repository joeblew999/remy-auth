import { sections, type Section } from '@/lib/sections';

/** A section's own files for AI tools, at the foot of its sidebar: its llms.txt and how to add its MCP server. */
export function AiLinks({ section }: { section: Section['key'] }) {
  const { llms, llmsFull, aiPage, mcpName } = sections.find(entry => entry.key === section)!;
  return <p className="px-2 pb-2 text-xs text-fd-muted-foreground">
    For AI tools: <a className="underline" href={llms}>llms.txt</a> · <a className="underline" href={llmsFull}>llms-full.txt</a> · <a className="underline" href={aiPage}>MCP server {mcpName}</a>
  </p>;
}
