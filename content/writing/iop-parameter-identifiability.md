---
title: "When a parameter sweep cannot identify its own model"
description: "Why independent endpoints for most eyelid thicknesses cannot support thickness-specific rational calibration parameters."
date: 2026-08-06
type: "Research Note"
topics:
  - CAE
  - Scientific Computing
status: working
lang: zh-CN
project: ANSYS_simulation_IOP
featured: false
source: docs/ansys-simulation-iop/identifiability.md
source_url: https://github.com/12sqawdwq/ANSYS_simulation_IOP/blob/main/analysis/README.md
---

The analysis pipeline records non-identifiability instead of filling missing parameters by interpolation or by sharing a fit across thicknesses. That negative result constrains what later calibration work is allowed to claim.
