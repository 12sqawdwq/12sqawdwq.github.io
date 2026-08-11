# Test results

Validated on the Windows machine described in [ENVIRONMENT.md](ENVIRONMENT.md). Only checks actually observed are marked PASS.

## Build and native unit tests

Command:

```powershell
.\scripts\build.ps1 -Clean
```

Compiler flags included C11, `-Wall`, `-Wextra`, and `-Wpedantic`. The final clean build emitted no warnings.

| Check | Result |
|---|---|
| Configure/build with WinLibs GCC 14.2.0 and Ninja | PASS |
| `protocol-tests.exe` | PASS |
| Marker records split across byte/3-byte boundaries | PASS |
| Bounded tail and command-finished codec | PASS |
| `windows-pipe-tests.exe` fragmented every frame byte | PASS |
| Concurrent overlapped named-pipe read/write | PASS through broker integration |
| Current-user named-pipe security descriptor creation | PASS |
| `attach-mode-tests.exe` local parser and terminal-response classifier | PASS |
| `windows-conpty-smoke.exe` | PASS |
| ConPTY output with broker stdout/stderr redirected | PASS |
| `windows-attach-monitor-integration.exe` | PASS |
| CSI sequence deliberately split across two broker frames | PASS; following sentinel remained visible, with visual no-`K` screenshot validation |
| Native attach defaults to read-only monitor | PASS in a test ConPTY |
| `:t` enables forwarded terminal input | PASS |
| `Ctrl+\\`, then `:m` blocks human input again | PASS |
| CSI device reply still reaches PTY while monitoring | PASS as `TERMINAL_RESPONSE` |
| Windows attach reports the full 100x30 pane rather than reserving one row | PASS |
| `:q` sends DETACH and exits cleanly | PASS |
| CTest, 5 tests | PASS, 0 failures |

## Automated Windows broker integration

Commands:

```powershell
.\tests\windows-integration.ps1
# invokes:
node .\tests\windows-broker-integration.mjs
```

The latest retained report was intentionally deleted after success because it contained a 20+ MiB transcript. Its console result was `WINDOWS_BROKER_INTEGRATION_PASS`.

| Capability | Result / observed detail |
|---|---|
| ConPTY startup and private extension handshake | PASS |
| Attach-role handshake and live output channel | PASS |
| Terminal response is forwarded without changing broker state from `IDLE` | PASS |
| Ordinary command and exit 0 | PASS |
| Agent-set cwd, ordinary variable, function, and environment persistence | PASS |
| Right-input-set cwd/environment visible to next agent command | PASS |
| Unicode and spaces in session/cwd paths | PASS |
| Resize | PASS, broker status changed to 101x37 |
| ANSI bytes | PASS, raw SGR bytes retained |
| Interactive `Read-Host` | PASS, Unicode response from attach role |
| Right-side Ctrl+C protocol path | PASS, user interrupt, normalized 130, shell recovered |
| Agent abort protocol path | PASS, agent interrupt, normalized 130, shell recovered |
| Ctrl+C-ignoring shell / hard escalation | PASS, descendant grace elapsed, Job terminated, command normalized 130, shell restarted |
| 500 ms timeout | PASS, timed-out status, normalized 130 |
| Large output | PASS, 20 MiB payload generated |
| Full transcript | PASS, final 0.2.2 run grew by 23,463,510 bytes |
| Model/broker tail | PASS, no more than 100 KiB and retained end sentinel |
| Attach live delivery | PASS, at least 20 MiB received before assertion |
| Attach detach/reconnect | PASS, 256 KiB bounded replay included sentinel |
| Shell crash | PASS using `[Environment]::Exit(23)` |
| Automatic fresh ConPTY/shell after crash | PASS |
| Extension control-pipe reconnect | PASS |
| JSONL command metadata | PASS, 16 records including cwd, timeout, and hard-abort status |
| Orderly shutdown and Job lifecycle | PASS |

The test discovered and drove fixes for redirected standard handles, synchronous named-pipe cross-thread starvation, PowerShell/PSReadLine delayed output, timeout status, command-end cwd, attach backpressure, and ConPTY root-exit detection.

## Installed Pi extension test, no LLM call

Command:

```powershell
node .\tests\windows-pi-extension-rpc.mjs
```

Observed result: `WINDOWS_PI_EXTENSION_RPC_PASS`.

| Check | Result |
|---|---|
| Pi 0.81.1 loads installed `index.ts` through its normal global discovery | PASS |
| `/terminal`, `/terminal-status`, `/terminal-exec`, `/terminal-restart` registered | PASS |
| Installed TypeScript `TerminalClient` connects to installed native broker | PASS |
| `/terminal-exec` executes in persistent ConPTY | PASS |
| Ordinary PowerShell variable/environment persists to second command | PASS |
| No `extension_error` event | PASS |
| Pi `session_shutdown` stops daemon cleanly | PASS |

## Installation, command resolution, and raw Pi

| Check | Result |
|---|---|
| Global install to `%LOCALAPPDATA%\PiLiveTerminal` | PASS |
| Built/installed binary SHA-256 equality | PASS |
| `pio` resolves from per-user WindowsApps | PASS |
| `pi-raw` resolves from per-user WindowsApps | PASS |
| `pi` still resolves to original Pi | PASS |
| `pio doctor` required checks | PASS |
| `pi-raw --version` | PASS, 0.81.1 |
| Stock Pi RPC `bash` through configured Git Bash | PASS, `RAW_BASH_OK` |
| Workspace extension inert without `PI_TERMINAL_*` variables | PASS |
| Default install leaves PowerShell profiles unmodified | PASS, no marker |
| First uninstall removes root/extension/launchers | PASS |
| Second uninstall when absent | PASS |
| Reinstall after uninstall | PASS |
| Repeated install with existing config | PASS |

The optional `-SetAsDefaultPi` profile modification was not enabled; its opt-in path was code-reviewed but is not marked runtime PASS.

## Repository one-step setup

Commands:

```powershell
pwsh.exe -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -SkipBuild
```

| Check | Result |
|---|---|
| `setup.ps1` syntax under the PowerShell parser | PASS |
| Full setup invokes native build/CTest and broker integration before install | PASS |
| Full setup installs the tested binaries and finishes with `pio doctor` | PASS |
| `-SkipBuild` idempotent reinstall under PowerShell 7 | PASS |
| `-SkipBuild` idempotent reinstall under Windows PowerShell 5.1 | PASS |
| Direct no-argument `pio.ps1` call from a strict-mode shell | PASS; workspace dispatched after the null-argument fix |
| `bootstrap.ps1` PowerShell syntax | PASS |
| Commit-pinned remote bootstrap download, extract, full build/test/install/doctor | PASS |
| Bootstrap temporary directory cleanup | PASS after both failure and success paths |

The local full one-step run repeated 5/5 CTest, the complete broker suite (including a 23,463,796-byte transcript), installation, and doctor checks successfully. The public bootstrap was then invoked from a fresh Windows PowerShell process. Its first end-to-end run exposed a MinGW dependency-file path overflow under a long GUID directory; `c07bf90` shortened the bootstrap root to `%TEMP%\pio-<8 hex>`. The commit-pinned retry built from that short archive path, passed 5/5 CTest and the complete broker suite (23,464,281-byte transcript), installed, passed `pio doctor`, and removed its temporary source/build tree.

## `pio` / Windows Terminal process test

`pio --mode rpc --no-session --offline` was launched from an existing Windows Terminal session after installation.

Observed under one `WindowsTerminal.exe` process:

- left `pwsh.exe` running generated `left.ps1`;
- left child `node.exe ... pi-coding-agent ... --mode rpc --no-session --offline`;
- right `pwsh.exe` running generated `right.ps1`;
- right child `pi-terminal-attach.exe`;
- hidden `pi-terminald.exe`;
- broker child MSIX `pwsh.exe` under a headless ConPTY host.

The native attach process remained alive after raw-console setup and handshake. The broker transcript and startup log became non-empty. Both pane host processes had the same Windows Terminal parent PID. The disposable test workspace/processes were then removed.

| Check | Result |
|---|---|
| `pio` exits successfully after dispatch | PASS |
| Left invokes recorded stock Pi with all arguments preserved | PASS |
| Right invokes installed native attach with `--mode monitor` | PASS |
| 0.2.1 pane screenshot after split-ANSI fix | PASS; normal PowerShell prompt, no repeated literal `K` corruption |
| Fresh installed 0.2.2 pane screenshot | PASS; full prompt visible, no in-screen status row, pane title displays `[M] > | :t terminal :q detach` |
| Monitor input discoverability | PASS for ordinary physical key injection; local buffer appeared immediately in pane title |
| Daemon owns one persistent PowerShell | PASS |
| Left and right pane processes belong to same Windows Terminal process | PASS |
| Target tab / visual two-pane graph | PASS in the 0.2.2 launch screenshot and UI Automation tree |
| Native monitor/terminal keyboard routing inside test ConPTY | PASS |
| Physical keyboard Ctrl+C in a visible pane | MANUAL — native ConPTY attach path passed |
| Alternate-screen visual rendering while resizing | MANUAL — byte/resize path passed |

## 0.2.1 regression diagnosis

A screenshot of the reported failure showed a literal `K` on every right-pane row. The transcript contained valid `ESC[K` erase-line sequences. The marker parser intentionally emitted `ESC[` and the rest of a CSI record in separate visible callbacks; the 0.2.0 attach client rendered its local ANSI status bar after every callback. This produced `ESC[` + local status bytes + `K`, corrupting both the child control record and screen.

The fixed attach client tracks CSI, OSC, DCS, SOS, PM, and APC boundaries across broker frames and renders local UI only in VT ground state. A clean ConPTY integration run passed, and a separately launched installed native attach was captured showing a normal `PS ...>` prompt rather than the repeated `K` screen. The compact mode parser and forwarded-input path remain covered by the same native test.

The launcher test also exposed that `-w 0` selected the first Windows Terminal window on this multi-window desktop. Version 0.2.1 uses `-w last`. The installed launch retained its attach process and ACL setup completed without the earlier module-loading warning.

## 0.2.2 terminal follow-up

A fresh installed 0.2.2 workspace exposed two issues that the test ConPTY did not model: the in-screen bottom row could disappear after Windows Terminal viewport/scrollback changes, and focus/device responses forwarded as ordinary `INPUT` could leave broker ownership at `USER_COMMAND_OR_INTERACTIVE` without a new shell prompt. Windows status now uses a complete ground-state OSC pane title, no DECSTBM margin or cursor movement, and all rows are reported to ConPTY. Recognized terminal responses use protocol type 23 and do not claim user ownership.

The final clean native suite, full broker integration, and installed Pi RPC integration passed after these changes. A fresh 0.2.2 `pio` tab was captured with its left Pi, right PowerShell prompt, and `[M]` mode/title. UI Automation selected the exact workspace tab and ordinary physical key injection updated the local monitor buffer in the title. Synthetic Windows input could not reproduce a hardware Enter/Shift-symbol event under `ENABLE_VIRTUAL_TERMINAL_INPUT`, so visible-pane `:t` + Enter remains manual; the byte path passes the native ConPTY integration.

## Arch Linux / Kitty validation

Commands:

```sh
./scripts/build.sh
make -C native clean all test
node tests/linux-broker-integration.mjs
./tests/linux-install-integration.sh
./tests/linux-kitty-integration.sh
./tests/linux-integration.sh
```

| Check | Result |
|---|---|
| GCC 16.1.1 CMake clean build with `-Wall -Wextra -Wpedantic` | PASS, no emitted warnings |
| Clang 22.1.6 CMake clean build | PASS, no emitted warnings |
| Make clean build and unit tests | PASS, no emitted warnings |
| ASan + UBSan Debug build and CTest | PASS, 4/4 |
| Protocol, attach-mode, Bash broker, and zsh broker CTest | PASS, 4/4; repeated 5 consecutive runs inside an installed zsh-backed `pio` session |
| zsh test HOME/ZDOTDIR isolation from parent `pio` adapter variables | PASS |
| POSIX broker startup and authenticated Unix sockets | PASS |
| Session/state paths containing spaces, Unicode, apostrophe, and double quote | PASS |
| Separate short runtime socket directory for long XDG state paths | PASS |
| Immediate sequential EXEC after completion | PASS; no prompt-marker busy race |
| Persistent cwd, environment, and shell function | PASS in Bash and zsh |
| zsh original `.zshrc`, configured function, and existing `precmd` output before private marker | PASS |
| Failed command and timeout status/exit normalization | PASS |
| Attach stream, terminal-response forwarding, resize, and persistent input | PASS; direct-input test waits for observed PTY output before asserting ownership release |
| Detach/reconnect bounded replay | PASS |
| JSON command metadata and transcript | PASS |
| Isolated XDG install, doctor, pi-raw, uninstall | PASS |
| Atomic reinstall while the old broker executable is mapped | PASS |
| Uninstall stops a verified broker but preserves an unrelated stale-PID process | PASS |
| Kitty/tmux two-pane workspace, installed Pi RPC extension | PASS |
| Caller + persistent-file proxy environment propagated across a stale tmux server into both panes | PASS |
| Unsafe group/other-readable environment file rejected by `pio doctor` | PASS |
| tmux `extended-keys` + `extended-keys-format csi-u` enabled before Pi startup | PASS; no startup warning |
| Resize/reflow keeps mode status in `pane_title`, not PTY content | PASS |
| Native attach monitor → terminal → monitor, local detach | PASS via tmux PTY automation |
| Kitty OS window containing `Pi Workspace` with two tmux panes | PASS via Kitty remote inspection |
| Final installed Kitty screenshot after title-border/extended-key fixes | PASS; no warning, duplicate status row, or PTY row reservation |
| User Oh My Zsh/P10k/fastfetch startup with private marker hook | PASS via installed Kitty screenshot; one correctly sized P10k prompt |
| User alias, ZDOTDIR, P10k state, existing mommy `precmd`, and private marker hook | PASS; marker registered after user hooks |
| Pi `/terminal-exec` through installed extension in zsh/P10k session | PASS (`ZSH=5.9.1`, `P10K=loaded`) |
| Initial PTY dimensions taken from final placeholder split before shell startup | PASS |
| Pi pane shutdown terminates broker | PASS |

The automated Kitty test drives tmux keys and inspects pane text; it does not claim human keyboard timing.

### Live installed `pio` follow-up

A subsequent test ran from the installed Pi process inside session `87c7ebf8…`, with the native attach connected and visible in the same active Kitty window.

| Check | Result |
|---|---|
| Split ANSI/CSI record, six colors, stderr, CJK/Unicode, box drawing, carriage return, and long-line reflow | PASS; inspected in a `grim` window screenshot |
| Basic alternate-screen cursor addressing, attributes, Unicode, exit, and previous-screen restoration | PASS; inspected in a second live screenshot |
| Pane-border `[M]` status remains outside alternate-screen PTY content | PASS |
| Persistent environment and Bash function across separate tool calls | PASS |
| Installed proxy values in live broker shell | PASS; Google 204 and GitHub API 200 |
| Nonzero command status | PASS at broker layer: `FAILED`, raw/normalized exit 1 |
| Timeout status and prompt recovery | PARTIAL: `TIMED_OUT`, normalized 130, shell returned `IDLE`; a later statement in the same dot-sourced script still ran |
| Native Pi `isError` flag for failed/timed-out command | NOT IMPLEMENTED; result is structured status text |
| Unexpected interactive `git log` pager | Reproduced; timeout recovered and `git --no-pager` completed normally |
| JSONL metadata parsing and monotonic output offsets | PASS |

## Not run / still manual

- MSVC `/W4` build: no configured MSVC/Windows SDK toolchain; equivalent Windows GCC warning build passed in the earlier environment.
- Intentional Windows attach overflow above 64 MiB: protection path is implemented but not stress-tested in the final suite.
- Complex alternate-screen applications during live visual resize and physical keyboard Ctrl+C remain manual.
