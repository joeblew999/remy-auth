# The consumer fixture

What `vp run new-app` (run by `vp run release`) builds on every release and CI run ([issue #33](https://github.com/joeblew999/remy-auth/issues/33), fix 1): the
blank app made by `vp create @joeblew999:app` from this commit's `@joeblew999/create` (served by `registry.mjs`),
exactly as a new repository gets it, plus `files/` (new files only: a contract package
it owns and an API over it, and a part another package offers: the showcase's time-zones), set up the way
another repository sees the platform: the packages from tarballs with versions of their own, the template's `.npmrc`. `run.sh`
does it; see its steps.

`files/docs/content/users/index.md` is the blank app's page plus one line using `:ui[language_label]`, a word only
`@joeblew999/remy-ui`'s catalog defines: the docs build only when the installed package ships its catalog (issue #44).
