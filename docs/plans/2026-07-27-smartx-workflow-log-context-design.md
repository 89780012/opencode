# SmartX Workflow Log Context Design

## Goal

Make every `smartx-workflow` application log readable as one workflow trace without changing individual log call sites.

## Design

The existing `write()` function remains the only application-log output boundary. It derives the strategy name from the workspace directory, reads the session from the supplied log metadata, and resolves the current persisted Run snapshot from `workflowRuns`.

Each message receives this fixed prefix:

```text
[smartx-workflow][session=<id>][strategy=<name>][workflow=<id>][stage=<stage>][state=<state>]
```

Unavailable values use `-`, so every line keeps the same searchable shape. The same context is added to structured `extra` fields as `strategy`, `sessionID`, `workflowId`, `workflowStage`, and `workflowState`. Existing business-specific fields remain unchanged.

## Verification

An automation test captures the application logger input and verifies both the human-readable prefix and structured workflow fields. Existing log assertions match the business-message suffix so they remain focused on the event being emitted.
