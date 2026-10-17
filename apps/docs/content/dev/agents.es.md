---
title: "Agentes: empieza aquí"
description: "Dónde empieza un agente de IA en este repositorio: los documentos que son dueños de las reglas, en orden de lectura, los sitios en producción y el flujo por el que pasa cada tarea."
translatedFrom: "f145cd6e f91dc1f7"
---

**Para agentes de IA** (Claude Code, Codex, cualquier otro) que trabajan en este repositorio, y para las
personas que los dirigen. Las reglas viven en estos documentos para desarrolladores, cada una en el
documento que es su dueño; esta página es el orden de lectura. El `AGENTS.md` y el `CLAUDE.md` de la raíz
solo apuntan aquí ([dónde viven las reglas](./how-we-work.md#where-rules-live)). Lee los documentos de
abajo antes de cambiar nada, y síguelos por encima de tus propios valores predeterminados.

Cuando dos páginas no coinciden, gana [la tabla del flujo](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest),
y la página que no coincide es un error: corrígelo en la página en la que estás
([si ves algo, corrígelo](./how-we-work.md#see-something-fix-it-or-write-it-down-in-the-same-landing)).
Una contradicción entre páginas nunca es motivo para detenerse, ni para preguntarle al dueño cuál es correcta.

En producción: la app <https://remy-auth.gedw99.workers.dev> (staging, con el inicio de sesión automático:
<https://remy-auth-staging.gedw99.workers.dev>); los docs para desarrolladores
<https://remy-auth-docs.gedw99.workers.dev/dev> (la guía de producto `/docs`, la referencia de API
`/reference`; servidores MCP `/api/mcp/dev`, `/api/mcp/reference`, `/api/mcp/docs`; todo para
herramientas de IA en `/llms.txt`). El origen de estas páginas es `docs/content/dev/*.md`: lee eso, no
las traducciones que están al lado (`*.es.md`).

1. [Principios de desarrollo](./principles.md): propiedad, única fuente de verdad, puertas de
   pruebas, código generado, decisiones del dueño.
2. [Herramientas para desarrolladores](./tooling.md): herramientas fijadas y habilidades de agente; todos los
   comandos están en [Comandos](./commands.mdx), generados a partir de la línea de comandos. Ejecuta los comandos del proyecto con `npm run <script>`.
3. [Ejecutar, previsualizar y probar la app](./run-and-test.md): un solo Worker, objetivos de
   prueba locales y remotos, Cloudflare.
4. [Cómo trabajamos](./how-we-work.md): primero las herramientas del proyecto, encuestas antes de
   elegir herramientas, shadcn y TanStack de principio a fin para la UI, el flujo y quién ejecuta cada
   paso, trabajo multiagente. Registra ahí las reglas de trabajo, no en la memoria del agente.
5. [Inicio de sesión y permisos](./auth.md): el guard, el motor de relaciones, `<Allowed>`, entornos
   y correo: lo que recibe toda app de Remy, y dónde remy-auth usa cada uno de ellos.
6. El plan en [`.plans/`](https://github.com/joeblew999/remy-auth/tree/main/.plans) que cubre tu
   tarea, y sus [roles de Executor/Reviewer](./principles.md#plans-and-roles).

Empieza con `npm run dev:status` (qué está pasando) y
[las herramientas propias del proyecto](./how-we-work.md#use-the-projects-own-tools-first), y termina
siguiendo [el flujo](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest):
`npm run dev:change` después de cada cambio, `npm run dev:land -- "<qué cambió>"` cuando el trabajo
está terminado y la comprobación está en verde.

## Trabajar desde la nube de Claude [#working-from-claudes-cloud]

Un agente en la nube de Claude (Claude en la web o en el teléfono) no tiene token de Cloudflare:
`wrangler` y los despliegues de `npx remy cloudflare` no pueden iniciar sesión allí, y `dev:land` avisa de
que omitió staging, lo cual no es un fallo. En su lugar tiene el **conector de Cloudflare**, que se usa a
mano; nada en el repositorio depende de él. Cómo previsualizar una rama desde allí, y qué vive en
Cloudflare en lugar de en el repositorio: [En Cloudflare](./run-and-test.md#on-cloudflare).
