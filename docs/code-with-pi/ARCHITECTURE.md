# Architecture

## Process and ownership model

```text
Windows Terminal tab
  left pane: stock Pi TUI + TypeScript extension ─ control pipe ─┐
  right pane: native monitor/attach client ─────── attach pipe ─┤
                                                               v
                                                native pi-terminald
                                                  owns one ConPTY
                                                       |
                                                one persistent pwsh
```

There is exactly one shell and one PTY per workspace. Windows Terminal only lays out panes. It does not capture output or inject keystrokes. The extension never creates a second shell or PTY.

On Windows, `pi-terminald` is native C11. It owns:

- the ConPTY handle and its input/output pipes;
- a kill-on-close Job Object containing the shell process tree;
- current-user-only named pipes for control and attach roles;
- command state, marker parser, bounded tails, transcript, and metadata;
- an overlapped-I/O server so a pending read does not block output written by another thread.

## State and ownership

The broker reports:

- `STARTING`
- `IDLE`
- `AGENT_COMMAND_RUNNING`
- `USER_COMMAND_OR_INTERACTIVE`
- `INTERRUPTING`
- `SHELL_EXITED`
- `DISCONNECTED`

A nonce-bearing prompt marker, rather than visible prompt text, indicates that the persistent shell reached its prompt callback. On Windows, PSReadLine and PowerShell formatting can still emit visible bytes after callbacks return, so the broker keeps agent ownership until output has been quiescent for 150 ms. POSIX completes at Bash prompt recovery without this settle window.

The attach client starts in local read-only monitor mode. Windows displays a compact local status/command indicator in the pane title; POSIX emits the same status as `pane_title`, which `pio` exposes in a tmux pane border. Both keep local UI outside child screen content and report every terminal row to the ConPTY/PTY. `:t` enables terminal input; in terminal mode `Ctrl+\\` opens the local palette and `:m` restores monitoring. Monitor mode filters human keyboard input but recognizes CSI/OSC/DCS terminal device responses and returns them to the PTY, preserving terminal negotiation. `:q` and Ctrl+] detach locally.

The marker parser and transport may split a child VT control record at any byte, notably `ESC[` and its CSI parameters. The attach client therefore carries a VT boundary state across IPC frames. Both implementations emit a complete local OSC title only in ground state and never repaint child rows. This prevents the 0.2.0 failure where split `ESC[K` records appeared as literal columns of `K` and the POSIX resize/reflow case where an old in-screen status row remained duplicated.

Forwarded human attach input while idle marks a user-edited line. Enter transfers ownership to a user command until prompt recovery. Recognized terminal-generated responses use `TERMINAL_RESPONSE`, are written to the PTY, and do not claim user ownership. Agent injection is accepted only when the shell is settled idle and no user line is being edited. Agent and attach writes are serialized by the broker (with an explicit native write lock on Windows and one event loop on POSIX).

## Command execution

The daemon writes the exact UTF-8 command to a private source file and creates a private wrapper. The persistent PowerShell, Bash, or zsh process dot-sources it. Consequently cwd, variables, functions, environment, imported modules, and virtualenv activation can persist.

The wrapper emits private start/end OSC records and the prompt hook emits cwd in base64. The end record captures exit status; Windows also carries immediate cwd there, while POSIX updates cwd from prompt recovery. The marker parser strips only records with the exact random session nonce; all other PTY bytes pass through.

PowerShell success-stream values are formatted through a streaming pipeline before being written to the terminal. Completion is not returned to Pi until end/prompt markers and the output-settle window agree.

## Cancellation and process lifetime

- Right-pane Ctrl+C becomes byte `0x03` and is written to ConPTY/PTY. The waiting command is tagged as a user interrupt and normalized to exit 130.
- Pi `AbortSignal` sends `ABORT`. The broker writes ETX and escalates after configured grace periods; Windows uses descendant/Job termination and POSIX signals the foreground process group.
- A last-resort shell loss is reported. Windows can start a fresh ConPTY when configured; POSIX automatic shell restart is not yet implemented. Shell-local state is necessarily lost.
- Ctrl+] detaches only the right client.
- On Windows, closing the Job Object kills descendants, preventing orphan shell trees.

On Windows, ConPTY keeps its output channel open after the root exits. The monitor closes the pseudoconsole while the output thread continues draining; EOF then drives `SHELL_EXITED` and optional restart. POSIX drains PTY data through `POLLHUP`/EOF, reports shell exit, and stops the broker.

## Output tiers and backpressure

1. Right pane: complete visible PTY byte stream.
2. Disk: append-only visible `transcript.raw`, source files, and `commands.jsonl` metadata.
3. Model: fixed-size active-command ring, default 100 KiB; the TypeScript layer additionally applies the configured line limit.

On Windows, attach delivery uses a separate writer thread and a 64 MiB bounded queue. The PTY/transcript reader does not wait for normal terminal painting, and a client that exceeds the bound is disconnected explicitly. POSIX currently writes attach frames synchronously.

Reconnect receives a bounded 256 KiB raw replay before live output. This is byte replay, not terminal screen emulation.

## Launcher and installation

`pio.ps1` creates a current-user-only session directory, starts the daemon, resolves an MSIX PowerShell alias to the package executable for ConPTY, writes argument-safe left/right scripts, and submits one `wt.exe` invocation containing `new-tab ; split-pane`.

`pi-raw` calls the recorded original Pi without workspace environment variables. The globally discovered extension returns immediately in that mode.

## Linux/tmux path

The Linux path uses a POSIX PTY, Unix-domain sockets, termios attach, and tmux only as the pane host. It selects `PI_TERMINAL_SHELL` or the caller's `SHELL`. Bash uses an rcfile/PROMPT_COMMAND adapter. zsh starts through a temporary ZDOTDIR wrapper that loads the user's original `.zshenv`/`.zprofile`/`.zshrc`, restores the original ZDOTDIR, and appends `__pi_live_prompt_marker` with `add-zsh-hook precmd`; existing Oh My Zsh, P10k, plugin, completion, and user hooks stay intact. Runtime code does not use `send-keys` or `capture-pane`; the Kitty/tmux integration test uses those tmux test APIs to drive and inspect the native attach pane.

Session data remains under `XDG_STATE_HOME`, while control/attach sockets use a short private directory under `XDG_RUNTIME_DIR` (or `/tmp` fallback) to stay within `sockaddr_un` path limits. `pio` first creates the final tmux split with placeholders, reads the right pane's dimensions, starts the PTY at that size, waits for the first private prompt marker, and only then respawns the Pi/attach panes. This prevents width-dependent P10k instant/final prompts from being replayed at a different geometry. The launcher explicitly carries HOME, PATH, and XDG values into panes so a long-lived tmux server cannot substitute stale environment values.

Arch Linux broker, install/uninstall, and Kitty/tmux workspace tests pass. POSIX still lacks Windows parity for automatic shell restart, attach backpressure, and output-settle behavior; see [LIMITATIONS.md](LIMITATIONS.md).
