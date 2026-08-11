# Writing content audit

This audit records the disposition of technical material that existed before the notebook generator was introduced. It is an editorial map, not a second article index.

## Promoted into the generated notebook

| Existing/public source | Type | Topics | Project | Status | Notebook entry |
| --- | --- | --- | --- | --- | --- |
| `docs/code-with-pi/ARCHITECTURE.md` | Build Note | Systems; Developer Tools; AI Agents | code-with-pi | published | `persistent-terminal-architecture` |
| `docs/code-with-pi/TEST-RESULTS.md` | Build Note | Systems; Developer Tools; AI Agents | code-with-pi | published | `persistent-terminal-validation` |
| `docs/code-with-pi/LIMITATIONS.md` | Note | Systems; Developer Tools; AI Agents | code-with-pi | published | `persistent-terminal-limitations` |
| `docs/ansys-skill/README.md` | Build Note | Engineering Software; CAE; AI Agents | ANSYS_skill | published | `ansys-result-state-gates` |
| `docs/ansys-skill/skill/mechanical_mvp_protocol.md` | Build Note | Engineering Software; CAE; AI Agents | ANSYS_skill | published | `mechanical-mvp-protocol` |
| `docs/ansys-skill/skill/failure_taxonomy.md` | Note | Engineering Software; CAE; AI Agents | ANSYS_skill | published | `mechanical-failure-taxonomy` |
| Current ForgeSpec repository and architecture roadmap | Build Note | Engineering Software; CAD; AI Agents | ForgeSpec-Studio | published | `forgespec-assembly-spec` |
| Public mesh audit in ANSYS_simulation_IOP | Research Note | CAE; Scientific Computing | ANSYS_simulation_IOP | working | `eyelid-mesh-sensitivity` |
| `docs/ansys-simulation-iop/identifiability.md` | Research Note | CAE; Scientific Computing | ANSYS_simulation_IOP | working | `iop-parameter-identifiability` |
| Current public CoughKD evidence | Research Note | Medical AI; Scientific Computing | CoughKD | working | `coughkd-measured-baseline` |
| Current public Harmony_TaskFlow evidence | Build Note | Embedded; Systems; Developer Tools | Harmony_TaskFlow | published | `harmonyos-integration-boundaries` |
| `docs/mes204-lcd/README.md` | Build Note | Embedded | MES204_lcd | published | `stm32-lcd-trex` |
| Redacted `docs/jetbrains-network-validation/report.md` | Note | Systems; Developer Tools | — | published, historical | `jetbrains-network-validation` |

## Kept as supporting material, not independent articles

| Material | Classification | Disposition |
| --- | --- | --- |
| `docs/ansys-skill/skill/SKILL.md` | Build Note support; Engineering Software / CAE / AI Agents; ANSYS_skill | Agent-facing duplicate of the public state-gate material; retained at its old URL, not indexed separately. |
| `docs/ansys-skill/skill/recovery_prompts.md` | Note support; Engineering Software / CAE / AI Agents; ANSYS_skill | Operational prompt fragments; retained as companion material. |
| `docs/forgespec-studio/README.md` | Build Note support; Engineering Software / CAD | Historical website copy; the generated note uses current repository evidence instead. |
| `docs/blueknow-offset/applanation_group_comparison.md` | Research Note fragment; CAE / Scientific Computing; ANSYS_simulation_IOP; working | Too short and tied to an older model to stand alone. Kept for provenance. |
| `docs/blueknow-offset/runs_readme.md` | Research operations note; CAE / Scientific Computing; working | Run catalog fragment, not an article. |
| `docs/blueknow-offset/remote_solve_packages.md` | Build/operations note; CAE / HPC; archived | Infrastructure details were generalized; retained at the old URL but excluded from Writing. |
| `docs/cough-project/README.md` | Research plan; Medical AI; CoughKD; archived | Superseded by the current tested CoughKD repository; target tables must not be treated as measured results. |
| `docs/cough-project/plan.md` | Build plan; Medical AI; CoughKD; archived | Historical execution plan, retained for process provenance. |
| `docs/cough-project/plan2.md` | Research/build plan; Medical AI; CoughKD; archived | Long-horizon planned checklist, not observed results. |
| `docs/learning-plan/270-day-engineering-cs-chip-learning-plan.md` | Note; Systems / Embedded / Scientific Computing; working | One generated study pack, not 270 posts. Old URL remains available. |
| `docs/learning-plan/learning_docs/*.md` | Companion note fragments; mixed study topics; working | Eighteen module indexes plus usage instructions; treated as one pack rather than separate articles. |
| `docs/terminal-gauss/README.md` | Build Note; Systems / Scientific Computing; terminal-gauss-Mamma-viz; archived pending review | Bilingual project README references media not present in this website copy; retained at its old URL, not promoted. |
| CV Markdown files | About/CV, not Writing | Kept outside the notebook taxonomy. |

## Generated evidence pages

Six HTML pages remain project artifacts rather than prose articles. Their URLs are preserved and project pages may link to them, but they do not receive Type/Topic metadata:

- eye-pressure static call graph;
- ForgeSpec application/call-graph extraction;
- Lorenz browser sketch;
- signal visualization;
- smart-cushion PCB design-rule report;
- smart-cushion STM32 call graph.

The earlier JetBrains raw-report HTML URL is retained as a redacted landing page pointing to the sanitized notebook entry; the raw infrastructure bundle is no longer served.

## Editorial inbox

Four public-safe editorial stubs live in `content-inbox/`. They are excluded from all generated routes and RSS until their claims are verified. Active medical-device, unpublished medical-AI, patent-sensitive, and infrastructure-specific staging material was not exported.
