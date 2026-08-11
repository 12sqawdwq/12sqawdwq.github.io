---
title: "A narrow Mechanical delivery protocol"
description: "A stepwise Discovery-to-Workbench-to-Mechanical path with explicit success signals and recovery actions."
date: 2026-06-01
type: "Build Note"
topics:
  - Engineering Software
  - CAE
  - AI Agents
status: published
lang: zh-CN
project: ANSYS_skill
series: "Validating Mechanical automation"
series_order: 2
featured: false
source: docs/ansys-skill/skill/mechanical_mvp_protocol.md
source_url: https://github.com/12sqawdwq/12sqawdwq.github.io/blob/main/docs/ansys-skill/skill/mechanical_mvp_protocol.md
---

The protocol is intentionally narrow. Each stage names the evidence expected before the workflow advances, and the final gate remains an evaluated Mechanical result rather than file existence alone.
