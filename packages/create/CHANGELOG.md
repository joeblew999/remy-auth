# @joeblew999/create

## 0.17.0

### Minor Changes

- b2b5326: The packages Node loads are built with vp pack (dist/, publishConfig's exports) instead of hand-kept .js and .d.ts
  files; new apps come from `vp create @joeblew999:app` (the new @joeblew999/create), and `remy upgrade` takes the
  release's blank app the same way.
