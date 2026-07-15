# SmartX Python Runtime Enforcement

## Goal

Ensure that an AI working in a SmartX session executes Python code and workspace Python scripts only through the CPython bundled under `SMART_HOME`, rather than an ambient system interpreter, virtual environment, or package manager launcher.

## Confirmed Facts

- `smartx_python` already resolves its interpreter exclusively from `SMART_HOME` and rejects PATH fallback in `packages/smartx-workflow/src/python.ts`.
- The same tool currently accepts source text only, so an agent that first writes a `.py` file tends to use the generic `bash` tool to execute it.
- `smartx-helper` permits both `bash` and `smartx_python`; a Skill instruction alone cannot prevent a shell tool call.
- The workbench message list only renders tool states and inputs. It does not execute processes.

## Requirements

- R1: `smartx_python` must accept exactly one executable source: inline `code` or a workspace-relative `.py` `file`.
- R2: File execution must validate the resolved target remains inside the active worktree, follows symlinks before checking containment, and never invokes a shell.
- R3: SmartX workflow must reject generic `bash` commands that start a Python interpreter, Python package manager, virtual-environment launcher, or `.py` script, with an actionable error naming `smartx_python`.
- R4: The workbench model-chain route must force `smartx-helper`, and the system prompt, SmartX helper instructions, and market-data Skill must consistently direct that agent to `smartx_python` for both inline code and saved scripts.
- R5: The workbench must render a `smartx_python` file invocation as Python input rather than opaque JSON.
- R6: Existing inline Python behavior, permission requests, cancellation, bounded output, and workspace lifecycle gates must remain unchanged.

## Acceptance Criteria

- [ ] Calling `smartx_python` with inline code still sends source through stdin to the bundled interpreter.
- [ ] Calling `smartx_python` with a relative `.py` file executes that exact file using the bundled interpreter and passes normal argv values without a shell.
- [ ] Missing, absolute, outside-worktree, symlink-escape, non-file, non-Python, and simultaneous `code` plus `file` inputs fail before a process starts.
- [ ] Direct Bash invocations such as `python job.py`, `py job.py`, `python -m pip`, `uv run python job.py`, and direct `.py` execution are rejected before Bash runs.
- [ ] Non-Python Bash commands remain available.
- [ ] The workbench displays a file invocation as Python and retains input metadata.
- [ ] Focused workflow and frontend tests, package type checks, and the workflow build pass.

## Out Of Scope

- Adding a remote MCP Python executor or exposing `SMART_HOME` to the model.
- Changing the SmartX installer and plugin distribution owner.
- Supporting arbitrary executable file types, system Python fallback, or runtime package installation.
