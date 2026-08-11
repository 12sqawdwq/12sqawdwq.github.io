---
title: "One shell, two observers: the persistent terminal architecture"
description: "How a native broker owns one PTY or ConPTY while an agent and a human share observation and controlled input."
date: 2026-08-06
type: "Build Note"
topics:
  - Systems
  - Developer Tools
  - AI Agents
status: published
project: code-with-pi
series: "Building code-with-pi"
series_order: 1
featured: true
source: docs/code-with-pi/ARCHITECTURE.md
source_url: https://github.com/12sqawdwq/code-with-pi/blob/main/pi-live-terminal/ARCHITECTURE.md
---

This is the current architecture note for the terminal broker. It focuses on process ownership, command state, marker parsing, cancellation, output tiers, and the places where Windows and POSIX still differ.
