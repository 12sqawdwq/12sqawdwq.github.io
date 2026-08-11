---
title: "Why ForgeSpec keeps a typed specification between a prompt and CAD"
description: "Separating requirement interpretation, domain planning, deterministic CadQuery generation, and artifact validation."
date: 2026-05-24
updated: 2026-08-11
type: "Build Note"
topics:
  - Engineering Software
  - CAD
  - AI Agents
status: published
project: ForgeSpec-Studio
featured: true
source_url: https://github.com/12sqawdwq/ForgeSpec-Studio
---

## Problem

A prompt-to-CAD demo can collapse requirement interpretation, planning, geometry generation, and the final artifact into one opaque step. If the output is wrong, it becomes difficult to tell whether the model misunderstood the object, selected the wrong generator, invented a standard dimension, or built the geometry incorrectly.

ForgeSpec Studio inserts typed intermediate representations so those failures remain distinguishable.

## Current path

```text
engineering brief
  → typed CadBrief
  → task classification
  → domain planner and standards library
  → AssemblySpec
  → deterministic CadQuery source
  → STEP / STL / preview / metadata
  → validation and assurance artifacts
```

The model may help interpret a loose brief. It does not directly become the manufacturing definition. A local standards table can expand supported fasteners, while the planner keeps standard parts separate from the main requested object.

## Why `AssemblySpec` matters

`AssemblySpec` is a review boundary. It records named parts, dimensions, materials, tolerances, interfaces, standard references, transforms, and assumptions before geometry is exported. The same specification can be inspected, edited, regenerated, or rejected without treating a mesh preview as design truth.

Keeping runnable CadQuery source beside STEP and STL also makes the build reconstructable. The source is policy-checked before source-driven builds, and every job writes a manifest and an assurance report.

## Trade-offs

Typed planning narrows what the generator can express. The current standards catalog and deterministic generator families are deliberately small. Assembly placement is planning-oriented rather than a complete mating-constraint solver, and structural artifact checks are not FEA, tolerance-stack analysis, fatigue assessment, or design-code validation.

The extra representation layer also creates schema-maintenance work. A field that is too vague simply moves ambiguity from the prompt into JSON; a field that is too rigid prevents useful designs. The schema therefore has to evolve with actual failed briefs rather than with an attempt to model every possible CAD system in advance.

## What changed

The project moved away from direct prompt-to-final-JSON generation. Intent classification, part planning, standard-library expansion, target-drift checks, deterministic source generation, and job-scoped validation now form separate stages covered by tests.

## Remaining question

The open question is how far deterministic families and inspectable intermediate state can go before a richer geometric constraint system becomes necessary. No generated artifact should be manufactured without dimensional, material, load, tolerance, and safety review.
