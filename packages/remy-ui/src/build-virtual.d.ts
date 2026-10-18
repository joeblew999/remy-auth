// The module remyBuild() (./build-vite.js) generates: what this build is, the same value in the Worker
// and in the page it serves.
declare module 'virtual:remy-build' {
  export const build: import('./build').Build;
}
