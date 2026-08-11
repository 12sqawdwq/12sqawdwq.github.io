---
title: "The trend survived mesh refinement; the amplitude did not"
description: "A three-level finite-element audit where response ordering remained stable but the absolute output missed the registered mesh-independence criterion."
date: 2026-08-10
type: "Research Note"
topics:
  - CAE
  - Scientific Computing
status: working
project: ANSYS_simulation_IOP
featured: true
source_url: https://github.com/12sqawdwq/ANSYS_simulation_IOP/blob/main/thickness_mesh_independence/DETAILED_REPORT.md
---

## Question

When eyelid thickness increased from 1.60 mm to 2.00 mm, a coarse finite-element model showed a decreasing pressure-related response. I wanted to separate two questions:

1. Does the **ordering** survive mesh refinement?
2. Is the **absolute amplitude** mesh independent under the registered 2% criterion?

They are not the same question.

## Setup

The audit used three eyelid thicknesses, three global mesh sizes, and paired 0/20 mmHg pressure states. Probe advancement, corneal thickness, material scales, contact formulation, and the pressure-related observable were held fixed across each comparison.

The observable was computed from the pressure-paired probe-force difference:

$$
q_{20}(h)=\frac{F(h,20,d)-F(h,0,d)}{A_{probe}}.
$$

The study used completed MAPDL endpoints with zero solver errors, matched discretization inside each pressure pair, and a penetration quality-control threshold. Those checks reject incomplete runs and mismatched pairs; they do not establish convergence by themselves.

## Result

| Global mesh | q(1.60 mm) | q(1.80 mm) | q(2.00 mm) | Largest change from previous level |
| ---: | ---: | ---: | ---: | ---: |
| 0.30 mm | 7.3720 mmHg | 7.2205 mmHg | 6.7996 mmHg | — |
| 0.24 mm | 6.6048 mmHg | 6.3904 mmHg | 5.9892 mmHg | 11.92% |
| 0.20 mm | 5.8586 mmHg | 5.6457 mmHg | 5.2518 mmHg | 12.31% |

All three levels preserve

$$
q(1.60)>q(1.80)>q(2.00).
$$

But the two finest levels still differ by as much as 12.31%, well above the pre-registered 2% threshold.

## Interpretation

The direction of the thick-end response is robust **inside the current model and tested meshes**. The absolute values are not mesh independent. A stable ordering is useful evidence, but it is weaker than a converged quantitative prediction.

This means the audit does not support calling 1.60 mm a physical threshold, using the current amplitudes as hardware calibration, or extrapolating them to different materials, geometries, loading paths, or tissue.

## Limitation

The refinement was global rather than targeted at the two contact interfaces. Solver ranks, I/O conditions, and campaign concurrency also differed, so recorded wall time is historical operational evidence rather than a controlled scaling benchmark.

## Next question

A better next experiment is a pre-registered local-refinement study with consistent contact-surface topology, tighter force/contact tolerances, and one pressure pair used as a resource preflight before expanding the matrix. More global refinement would be expensive without directly resolving why the contact response is still moving.
