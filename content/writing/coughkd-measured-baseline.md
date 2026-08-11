---
title: "Separating measured cough-model runs from the experiment plan"
description: "A subject-disjoint Coswara pipeline, compact teacher–student baselines, and the evidence boundary before any clinical or SOTA claim."
date: 2026-04-27
updated: 2026-08-11
type: "Research Note"
topics:
  - Medical AI
  - Scientific Computing
status: working
project: CoughKD
featured: true
source_url: https://github.com/12sqawdwq/CoughKD
---

## Question

Can a cough-audio teacher–student pipeline be made reproducible before arguing about model quality?

The first risk was not architecture selection. It was subject leakage, ambiguous dataset roles, and target tables that could be mistaken for observations.

## Setup

The current Coswara path filters cough recordings and constructs a subject-disjoint split:

| Split item | Count |
| --- | ---: |
| Filtered recordings | 5,247 |
| Subjects | 2,635 |
| Train recordings | 3,671 |
| Validation recordings | 785 |
| Test recordings | 791 |

Manifests carry recording and subject identity, dataset, path, label, and split. Validation is intended to fail if one subject crosses split boundaries. External datasets are not used for checkpoint selection.

## Measured baselines

One compact CUDA closed loop trained an in-repository `ConvTeacher` with 110,277 parameters and a `DepthwiseStudent + KD` with 20,717 parameters. Held-out macro one-vs-rest AUROC was 0.577184 for the teacher and 0.580959 for the student.

A fresh 2+2 epoch run against the actual local Coswara directory measured 0.566054 for the same compact teacher and 0.571329 for the distilled student.

The first completed foundation-teacher run used the official PANNs CNN14 16 kHz checkpoint as a frozen AudioSet backbone. On its held-out test split, macro one-vs-rest AUROC was 0.613420 for the PANNs teacher, 0.563910 for the CE-only depthwise student, and 0.566423 for the KD student.

## Interpretation

These runs show that the pipeline can build a subject-disjoint manifest, train on CUDA, select on validation data, and evaluate a held-out test split. They do not show that the compact models are clinically useful, state of the art, or robust across datasets.

The PANNs result also keeps an important comparison visible: knowledge distillation slightly exceeded the CE-only student in that run, but both remained below the teacher. One run is not enough to claim a general distillation gain.

## Limitations

- Labels come from a public crowdsourced dataset with device, demographic, collection, and label-noise confounders.
- Cross-dataset evaluation, calibration, subgroup analysis, confidence intervals, and deployment benchmarks remain incomplete.
- Patient-level representation learning is only defensible where identity labels and permissions support it.
- Planned target values elsewhere in the research scaffold are not measurements.
- This repository makes no clinical or diagnostic claim.

## Next question

Before longer training, the experiment needs frozen manifests, feature-cache provenance, CE-only controls, multiple seeds or folds, extended metrics, and external evaluation. The useful next result is not a larger number by itself; it is a result whose data and selection path remain auditable.
