# Design: SmartX Python Runtime Enforcement

## Boundary

`smartx-workflow` remains the execution boundary. It resolves the bundled CPython from `SMART_HOME`, creates the child process with `Bun.spawn`, and never forwards Python source to a shell. The model receives a single first-class `smartx_python` tool rather than an interpreter path.

## Execution Contract

`smartx_python` accepts `description`, optional `args`, optional `timeout`, and exactly one of:

- `code`: complete Python source, executed with `python -u -`.
- `file`: a worktree-relative `.py` path, executed with `python -u <resolved-file>`.

For `file`, the plugin resolves the active worktree and candidate file with `realpath`, verifies containment after symlink resolution, verifies a regular file and `.py` extension, then passes the resulting path as an argv element to `Bun.spawn`. No command string is assembled.

## Shell Policy

The global workflow hook inspects Bash tool input before workspace lifecycle processing. It rejects commands whose executable position invokes a Python interpreter, package-management launcher, virtual-environment launcher, or a `.py` script. The parser is intentionally command-position based so documentation commands such as `echo python` remain available.

The hook also adds a compact system instruction. This limits repeated bad calls when a Skill is not loaded while leaving non-Python Shell work intact.

The workbench model-chain route assigns `smartx-helper` after decoding request JSON so a client cannot replace the agent with one that lacks `smartx_python`.

## Compatibility

Inline calls keep their current argv shape and stdin behavior. File execution uses the same interpreter selection, permissions, output streaming, timeout, abort, and process-tree cleanup path. Existing session lifecycle code continues to classify `smartx_python` as `exec`.

## UI

The frontend recognizes a `file` input on `smartx_python` and renders the path in a Python-labelled code block. It does not resolve or display the interpreter path.

## Rollback

Removing the new optional `file` input and pre-hook restores the prior inline-only behavior. No data schema, external API, or MCP contract changes are introduced.
