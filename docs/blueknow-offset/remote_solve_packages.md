# Remote Solve Packages

This folder documents a Windows-to-Linux MAPDL solve handoff. Infrastructure-specific aliases and absolute paths have been removed from the public copy.

Configure the SSH target and workspace locally rather than committing them:

```powershell
$env:REMOTE_SSH = "<solver-host-alias>"
$env:REMOTE_ROOT = "<remote-workspace>"
$env:REMOTE_CONDA_ENV = "base"
$env:REMOTE_NP = "16"
$env:REMOTE_ANSYS_CMD = "<path-to-mapdl>"
```

Use SSH keys or an approved interactive login flow. Do not commit passwords, private keys, host inventories, or scheduler credentials.

## Workflow

From a selected solve package:

```powershell
.\upload.ps1
.\start_remote_solve.ps1
.\monitor_remote.ps1
.\fetch_results.ps1
```

Fetched solver results remain outside Git. Open the retrieved `file.rst` from the local result archive in Mechanical for review.

This is an operational handoff note, not evidence that a solve converged or that the model is physically valid. Inspect the run manifest, solver errors, quality-control outputs, and evaluated result state separately.
