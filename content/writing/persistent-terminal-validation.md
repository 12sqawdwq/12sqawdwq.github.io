---
title: "What I tested in the persistent terminal broker"
description: "Observed Windows and Linux checks for PTY lifecycle, authenticated IPC, state persistence, cancellation, replay, and human takeover."
date: 2026-08-06
type: "Build Note"
topics:
  - Systems
  - Developer Tools
  - AI Agents
status: published
project: code-with-pi
series: "Building code-with-pi"
series_order: 2
featured: false
source: docs/code-with-pi/TEST-RESULTS.md
source_url: https://github.com/12sqawdwq/code-with-pi/blob/main/pi-live-terminal/TEST-RESULTS.md
---

This record separates checks that were actually observed from manual or unimplemented cases. It is long because terminal behavior crosses process lifetime, byte-stream parsing, operating-system APIs, and visible interaction.
