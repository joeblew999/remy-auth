---
title: "Agentes: empieza aquí"
description: "Dónde empieza un agente de IA en este repositorio: los documentos que son dueños de las reglas, en orden de lectura, los sitios en producción y el flujo por el que pasa cada tarea."
translatedFrom: "82d7be50 338e15ff"
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

1. [Principios de desarrollo](./development.md): propiedad, única fuente de verdad, puertas de
   pruebas, código generado, decisiones del dueño.
2. [Herramientas para desarrolladores](./tooling.md): los scripts y comandos, herramientas fijadas y
   habilidades de agente. Ejecuta los comandos del proyecto con `npm run <script>`.
3. [Flujo de trabajo en tiempo de ejecución de la GUI](./gui.md): un solo Worker, objetivos de
   prueba locales y remotos.
4. [Cómo trabajamos](./how-we-work.md): primero las herramientas del proyecto, encuestas antes de
   elegir herramientas, shadcn y TanStack de principio a fin para la UI, el flujo y quién ejecuta cada
   paso, trabajo multiagente. Registra ahí las reglas de trabajo, no en la memoria del agente.
5. [Inicio de sesión y permisos](./auth.md): el guard, el motor de relaciones, `<Allowed>`, entornos
   y correo: lo que recibe toda app de Remy, y dónde remy-auth usa cada uno de ellos.
6. El plan en [`.plans/`](https://github.com/joeblew999/remy-auth/tree/main/.plans) que cubre tu
   tarea, y sus [roles de Executor/Reviewer](./development.md#plans-and-roles).

Empieza con `npm run dev:status` (qué está pasando) y
[las herramientas propias del proyecto](./how-we-work.md#use-the-projects-own-tools-first), y termina
siguiendo [el flujo](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest):
`npm run dev:change` después de cada cambio, `npm run dev:land -- "<qué cambió>"` cuando el trabajo
está terminado y la comprobación está en verde.

## Trabajar desde la nube de Claude [#working-from-claudes-cloud]

Un agente en la nube de Claude (Claude en la web o en el teléfono) no tiene token de Cloudflare:
`wrangler`, `npx remy cloudflare preview`, `staging` y `deploy` no pueden iniciar sesión allí; `dev:land`
aterriza mediante el pull request como en cualquier otro sitio y avisa de que omitió staging (sin inicio
de sesión en Cloudflare), lo cual no es un fallo. En su lugar tiene el **conector de Cloudflare** (las
herramientas de Cloudflare de la app, con la sesión iniciada como el dueño), que el agente usa a mano;
nada en el repositorio depende de él.

- **Una vista previa del trabajo, desde la nube**: haz push de la rama, sin pull request (`git push -u origin
  <branch>`; GitHub no ejecuta nada para una rama sin uno). Workers Builds de Cloudflare la compila y la
  sirve en `https://<branch>-remy-auth.gedw99.workers.dev`; las herramientas de builds del conector
  muestran la compilación y su log. Luego compruébala: `REMY_FLOW=hand npm run test -- remote https://<branch>-remy-auth.gedw99.workers.dev`
  (solo nuestras comprobaciones: una vista previa está oculta a los buscadores a propósito, así que las
  auditorías de Google juzgan producción).
  Comprobado el 2026-10-17: la rama `claude/cloud-previews` se compiló en Cloudflare en aproximadamente un minuto y pasó.
- **Los ajustes de compilación de Cloudflare** viven en Cloudflare, no en el repositorio, así que se
  escriben aquí y se cambian solo mediante el conector, para que coincidan: dos reglas de compilación en el
  Worker `remy-auth`, ambas con `npm run build`, y `NODE_VERSION` como en `.node-version`. `main`: despliega
  con `npx wrangler versions upload` (una versión nueva; producción solo se mueve con `dev:promote`). Todas
  las demás ramas: despliegan con `npx wrangler preview`.
  El 2026-10-17 faltaba la regla de las ramas, así que ninguna rama recibía vista previa aunque estos
  docs lo decían; se añadió mediante el conector.
- **Producción, staging y los comandos `npx remy cloudflare …`** se ejecutan en el Mac del dueño, que
  tiene el token.
