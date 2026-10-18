---
title: "Agentes: empieza aquí"
description: "Dónde empieza un agente de IA en este repositorio: los documentos que son dueños de las reglas, en orden de lectura, los sitios en producción y el flujo por el que pasa cada tarea."
translatedFrom: "54b09ad3 e03218b8"
---

**Para agentes de IA** (Claude Code, Codex, cualquier otro) que trabajan en este repositorio, y para las
personas que los dirigen. Las reglas viven en estos documentos para desarrolladores, cada una en el
documento que es su dueño; esta página es el orden de lectura. El `AGENTS.md` y el `CLAUDE.md` de la raíz
solo apuntan aquí ([dónde viven las reglas](./how-we-work.md#where-rules-live)). Lee los documentos de
abajo antes de cambiar nada, y síguelos por encima de tus propios valores predeterminados.

Cuando dos páginas no coinciden, gana [la tabla del flujo](./how-we-work.md#the-flow-the-standard-way-in-plain-sight),
y la página que no coincide es un error: corrígelo en el cambio en el que estás
([si ves algo, corrígelo](./how-we-work.md#see-something-fix-it-or-write-it-down-in-the-same-change)).
Una contradicción entre páginas nunca es motivo para detenerse, ni para preguntarle al dueño cuál es correcta.

En producción: la app <https://remy-auth.gedw99.workers.dev> (la Preview de cada rama subida, con el inicio de sesión automático:
`https://<branch>-remy-auth.gedw99.workers.dev`); los docs para desarrolladores <https://remy-auth-docs.gedw99.workers.dev/dev>
(la guía de producto `/docs`, la referencia de API `/reference`; servidores MCP `/api/mcp/dev`, `/api/mcp/reference`,
`/api/mcp/docs`; todo para herramientas de IA en `/llms.txt`). El origen de estas páginas es `apps/remy-auth-docs/content/dev/*.md`:
lee eso, no las traducciones que están al lado (`*.es.md`).

1. [Principios de desarrollo](./principles.md): propiedad, única fuente de verdad, puertas de
   pruebas, código generado, decisiones del dueño.
2. [Herramientas para desarrolladores](./tooling.md): herramientas fijadas y habilidades de agente; todos los
   comandos están en [Comandos](./commands.mdx), generados a partir de la línea de comandos. Ejecuta los comandos del proyecto con `vp run <name>` (una tarea o un script).
3. [Ejecutar, previsualizar y probar la app](./run-and-test.md): un solo Worker, objetivos de
   prueba locales y remotos, Cloudflare.
4. [Cómo trabajamos](./how-we-work.md): primero las herramientas del proyecto, encuestas antes de
   elegir herramientas, shadcn y TanStack de principio a fin para la UI, el flujo y quién ejecuta cada
   paso, trabajo multiagente. Registra ahí las reglas de trabajo, no en la memoria del agente.
5. [Inicio de sesión y permisos](./auth.md): el guard, el motor de relaciones, `<Allowed>`, entornos
   y correo: lo que recibe toda app de Remy, y dónde remy-auth usa cada uno de ellos.
6. El plan en [`.plans/`](https://github.com/joeblew999/remy-auth/tree/main/.plans) que cubre tu
   tarea, y sus [roles de Executor/Reviewer](./principles.md#plans-and-roles).

Empieza con los comandos estándar (`git status`, `git log`, `gh run list`: qué está pasando) y
[las herramientas propias del proyecto](./how-we-work.md#use-the-projects-own-tools-first), y termina
pasando por [el flujo](./how-we-work.md#the-flow-the-standard-way-in-plain-sight): `vp run ready`
después de cada cambio; cuando el trabajo está terminado y `vp run ready` está en verde, `vp run translate` si cambió algún texto, luego
`git commit` y `git push` a `main` (su hook ejecuta `vp run ci`), sin pedir permiso. Un push a `main` es el despliegue:
Cloudflare lo compila.

## Trabajar desde la nube de Claude [#working-from-claudes-cloud]

Un agente en la nube de Claude (Claude en la web o en el teléfono) no tiene token de Cloudflare:
`wrangler` y los comandos `pnpm remy cloudflare` no pueden iniciar sesión allí, y nada en el flujo los necesita (las
compilaciones propias de Cloudflare despliegan). En su lugar tiene el **conector de Cloudflare**, que se usa a
mano; nada en el repositorio depende de él. Cómo previsualizar una rama desde allí, y qué vive en
Cloudflare en lugar de en el repositorio: [En Cloudflare](./run-and-test.md#on-cloudflare).
