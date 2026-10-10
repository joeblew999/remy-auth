---
title: "Agentes: empieza aquí"
description: "Dónde empieza un agente de IA en este repositorio: los documentos que son dueños de las reglas, en orden de lectura, los sitios en producción y el flujo por el que pasa cada tarea."
---

**Para agentes de IA** (Claude Code, Codex, cualquier otro) que trabajan en este repositorio, y para las
personas que los dirigen. Las reglas viven en estos documentos para desarrolladores, cada una en el
documento que es su dueño; esta página es el orden de lectura. El `AGENTS.md` y el `CLAUDE.md` de la raíz
solo apuntan aquí ([dónde viven las reglas](./how-we-work.md#where-rules-live)). Lee los documentos de
abajo antes de cambiar nada, y síguelos por encima de tus propios valores predeterminados.

En producción: la app <https://remy-auth.gedw99.workers.dev> (staging, con el inicio de sesión automático:
<https://remy-auth-staging.gedw99.workers.dev>); los docs para desarrolladores
<https://remy-auth-docs.gedw99.workers.dev/dev> (la guía de producto `/docs`, la referencia de API
`/reference`; servidores MCP `/api/mcp/dev`, `/api/mcp/reference`, `/api/mcp/docs`; todo para
herramientas de IA en `/llms.txt`). El origen de estas páginas es `docs/content/dev/*.md`: lee eso, no
las traducciones que están al lado (`*.es.md`).

1. [Principios de desarrollo](./development.md): propiedad, única fuente de verdad, puertas de
   pruebas, código generado, decisiones del dueño.
2. [Herramientas para desarrolladores](./tooling.md): tareas de mise, herramientas fijadas y
   habilidades de agente. Ejecuta los comandos del proyecto a través de `mise run <namespace:action>`.
3. [Flujo de trabajo en tiempo de ejecución de la GUI](./gui.md): un solo Worker, objetivos de
   prueba locales y remotos.
4. [Cómo trabajamos](./how-we-work.md): primero las herramientas del proyecto, encuestas antes de
   elegir herramientas, shadcn y TanStack de principio a fin para la UI, el flujo y quién ejecuta cada
   paso, trabajo multiagente. Registra ahí las reglas de trabajo, no en la memoria del agente.
5. [Inicio de sesión y permisos](./auth.md): el guard, el motor de relaciones, `<Allowed>`, entornos
   y correo: lo que recibe toda app de Remy, y dónde remy-auth usa cada uno de ellos.
6. El plan en [`.plans/`](https://github.com/joeblew999/remy-auth/tree/main/.plans) que cubre tu
   tarea, y sus [roles de Executor/Reviewer](./development.md#plans-and-roles).

Empieza con `mise run dev:status` (qué está pasando) y
[las herramientas propias del proyecto](./how-we-work.md#use-the-projects-own-tools-first), y termina
siguiendo [el flujo](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest):
`mise run dev:change` después de cada cambio, `mise run dev:land -- "<qué cambió>"` cuando el trabajo
está terminado y la comprobación está en verde.
</content>
