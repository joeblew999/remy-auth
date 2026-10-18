// Ask AI's index follows each new version of the docs by itself: on the first request a new version answers, the
// Worker writes its own pages to the bucket AI Search reads (its DOCS_PAGES binding: no token, no build step), in the
// background, and removes what is no longer a page; AI Search's scheduled sync then indexes the change. Which pages,
// in which languages, the build worked out (vite.js, askObjects). Each page carries the version that wrote it (R2's
// custom metadata), so a version publishes once and the bucket holds nothing but pages, every one of which AI Search
// indexes; two first requests at once write the same files, which is harmless.

/**
 * The pages to publish, rendered here (`render` is the Worker's own handler, so nothing goes over the network), each
 * written under its key with this version; then every other key removed.
 */
export async function publishPages(
  bucket: R2Bucket,
  version: string,
  origin: string,
  render: (request: Request) => Response | Promise<Response>,
): Promise<void> {
  const objects = __REMY_DOCS_ASK_OBJECTS__;
  const last = objects.at(-1);
  if (!last || (await bucket.head(last[0]))?.customMetadata?.version === version) return;
  const wanted = new Set<string>();
  for (const [key, path] of objects) {
    const response = await render(new Request(new URL(path, origin)));
    if (!response.ok) throw new Error(`docs publish: ${path} answered ${response.status}`);
    await bucket.put(key, await response.text(), {
      httpMetadata: { contentType: 'text/markdown' },
      customMetadata: { version },
    });
    wanted.add(key);
  }
  for (let cursor: string | undefined; ;) {
    const listed = await bucket.list({ cursor });
    const stale = listed.objects.map((object) => object.key).filter((key) => !wanted.has(key));
    if (stale.length) await bucket.delete(stale);
    if (!listed.truncated) break;
    cursor = listed.cursor;
  }
  console.log(JSON.stringify({ event: 'docs.published', version, pages: wanted.size }));
}
