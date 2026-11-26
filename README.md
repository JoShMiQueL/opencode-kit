# opencode-kit — sistema agéntico swe (100% free)

Kit agéntico por proyecto para [opencode](https://opencode.ai), con
routing cost-aware sobre el plugin
[**opencode-devin**](https://github.com/JoShMiQueL/opencode-devin)
(provider `devin/*`). Patrones tomados de oh-my-opencode,
opencode-orchestrator-kit y OpenAgentsControl.

**Requisito:** el plugin `opencode-devin` conectado en opencode
(`/connect`). Todos los modelos de este kit resuelven como `devin/*`
contra tu suscripción Devin — sin API keys, sin proxy.

## Install

```bash
cd <tu-proyecto>
npx opencode-kit .
```

(o `npx JoShMiQueL/opencode-kit` directo desde GitHub sin publicar a npm)

Copia agentes a `.opencode/agent/`, comandos a `.opencode/command/` y
escribe `opencode.json` con `default_agent: orchestrator`.
Es idempotente (sobreescribe). Alternativa bash: `./install.sh .`

## Roster y lanes — todo Free

| Agente | Rol | Lane | Por qué |
|---|---|---|---|
| `orchestrator` | primary. Nunca ejecuta, solo delega y consume REPORT blocks | **swe-2#medium** | free — routing + síntesis, sin ejecutar |
| `planner` | planes por fases en `.opencode/plans/` (patrón Prometheus) | swe-2-1#low | free (promo) — única lane con 2.1, mayor leverage |
| `worker` | implementación completa, verificada | swe-2#high | free permanente — escribe código largo sin cortes |
| `reviewer` | review de diffs por severidad | swe-2#high | free permanente — juicio |
| `scout` | exploración read-only del repo, file:line | swe-2#low | free permanente — iterativo |
| `librarian` | docs/GitHub/web, mecanismos exactos con URLs | swe-2#low | free permanente — fetch+extraer |
| `tester` | corre tests/lint/build, reporta comprimido | swe-2#low | free permanente — mecánico |

## Coste: todo Free

Verificado con `devin models` + r/CognitionLabs + r/DevinAI (nov-2026):

- **swe-2-1** (todos los efforts): Free — promo de lanzamiento de 2
  semanas desde el 24-nov-2026. Si expira (~8-dic), históricamente
  Cognition siempre deja un tier swe free permanente (swe-2 lo es hoy).
  El kit solo lo usa en `planner` (la llamada de mayor leverage); si
  la promo cae, baja planner a `swe-2#low`.
- **swe-2 / swe-2-flash** (todos los efforts): Free **permanente** en
  Pro/Max/Teams — lo confirma el anuncio del plan Teams ("free sessions
  powered by SWE-2") y los threads de Reddit post-promo.
- **swe-2-flash NO se usa**: en la práctica corta streams de golpe en
  generaciones largas (límite de output del tier flash) — los subagentes
  morían a mitad de archivo. swe-2 normal es el lane estable.
  Documentado aquí para no reintentarlo.
- **lightning** ("Ultrafast" en el picker — label oficial de Cognition,
  no un error): de pago por token ($5/$25 Mtok) fuera de promos.
  Excluido del kit: sistema 100% free, sin depender de promos temporales.
- Claude/GPT/Gemini/GLM/Kimi: siempre de pago — fuera del kit.

## Cómo fijar el modelo en frontmatter

El plugin publica cada familia una vez — `devin/swe-2-1` — con los
efforts como **variants**. El formato correcto en config y agentes es
`devin/swe-2-1#high` (familia + `#` + effort). Los uids per-effort
(`devin/swe-2-1-high`) resuelven pero son deprecated y opencode puede no
pickearlos bien — usa siempre el formato `#variant`. Los modificadores
de velocidad son familias aparte (`devin/swe-2-1-lightning`). Sin
variant seleccionada la familia corre en medium. En la TUI se cicla el
effort con `ctrl+t`.

## Comandos

- `/implement <qué>` — scout→worker→tester según haga falta
- `/research <qué>` — scout (repo) o librarian (externo)
- `/plan-work <qué>` — planner con plan por fases, pregunta antes de ejecutar

## Contrato REPORT

Todos los subagentes terminan con un bloque compacto
(status/summary/artifact/files/next). El orchestrator consume solo eso —
su contexto no se infla con logs. Artefactos largos viven en
`.opencode/reports/`, planes en `.opencode/plans/` — handoff entre
sesiones vía disco, no vía chat.

## Patrones copiados de GitHub

- **oh-my-opencode** (code-yeongyu): intent-gate, orchestrator que nunca
  implementa, planner separado (Prometheus), ejecución por fases (Atlas),
  modelos casados a tipo de tarea.
- **opencode-orchestrator-kit** (NicoGenti): routing cost-aware con
  tiers en vez de ids hardcoded, spec de delegación de 9 secciones,
  memoria bullet-only en AGENTS.md, planes como archivos kanban
  resumibles en git, prompt-cache awareness (prompts estables por
  agente, parte variable solo en la delegación).
- **OpenAgentsControl** (darrenhinde): arquitectura de 4 capas
  tools→subagents→commands→main agents, descripciones de subagente
  orientadas a cuándo-usar ("Use WHEN..."), y la regla de no usar la
  maquinaria completa para tareas pequeñas — el orchestrator aquí tiene
  la regla "trivially small" por eso.
