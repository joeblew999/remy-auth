# The consumer fixture

What `vp run new-app` (the last part of `vp run ci`) builds on every release and CI run (.plans/platform-structure.md, fix 1): the
blank app (`template/`) exactly as a new repository gets it, plus `files/` (new files only: a contract package
it owns and an API over it, and a part another package offers: the showcase's time-zones), set up the way
another repository sees the platform: the packages from tarballs with versions of their own, the template's `.npmrc`. `run.sh`
does it; see its steps.
