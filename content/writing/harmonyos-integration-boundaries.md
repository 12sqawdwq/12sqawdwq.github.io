---
title: "What the HarmonyOS prototype could and could not verify"
description: "ArkTS UI, browser OAuth and deep links, native Mihomo libraries, VPN Extension limits, and repository-level evidence."
date: 2026-08-04
updated: 2026-08-11
type: "Build Note"
topics:
  - Embedded
  - Systems
  - Developer Tools
status: published
project: Harmony_TaskFlow
featured: false
source_url: https://github.com/12sqawdwq/Harmony_TaskFlow
---

## How the project changed

Harmony TaskFlow began as a task application. It became a systems-integration experiment because the difficult work accumulated at boundaries: browser-to-app deep links, Calendar OAuth, Cloudflare Worker state, ArkTS/native interfaces, multi-ABI Go libraries, VPN Extension behavior, and command-line HarmonyOS builds.

The repository now contains two applications. TaskFlow covers tasks, boards, profile state, and Calendar synchronization. Mihomo Harmony explores a standalone native core and VPN-facing application behavior.

## Calendar path

```text
TaskFlow HAP
  → sign-in in the system browser
  → Worker OAuth callback
  → hashed session and encrypted token storage
  → taskflow:// deep link
  → Calendar API synchronization
```

The purpose of this split is to avoid placing a reusable client secret or a desktop-local callback service inside the application flow. Public screenshots and fixtures exclude account addresses, subscription URLs, node credentials, and tokens.

## Native core path

The Mihomo source is pinned inside the repository, with a HarmonyOS c-shared adapter and a registry for source version, ABI, checksums, and release policy. Generated shared libraries and application packages are not committed. This keeps the source relationship visible while avoiding a binary store in Git history.

## Evidence collected

The TaskFlow application and its main views were exercised on a HarmonyOS 6.1.1 API 24 phone emulator. The cloud-auth worker was deployed and health-checked. The native core's local proxy path was verified, and repository hygiene checks cover tracked fixtures and secret-shaped files.

## Boundary that remained

The emulator image did not provide enough support to treat system VPN behavior as verified. A working local proxy and a loadable multi-ABI core are not equivalent to a validated device-level VPN Extension. The repository therefore keeps those states separate.

The current local portfolio environment also lacks the full HarmonyOS SDK, OHPM, Hvigor, and HDC toolchain, so this notebook does not claim a fresh local full build.

## What I would test next

The next useful evidence would come from a supported physical device: VPN lifecycle, permission transitions, restart behavior, network handoff, foreground/background state, ABI loading, and failure recovery. Until then, the prototype remains an integration record rather than a finished networking product.
