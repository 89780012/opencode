---
name: strategy-service
description: Domain guidance for SmartX Python component workspaces.
---

# Strategy Service

Use this skill when working inside a SmartX Python component workspace.
It provides SDK-specific guidance, project constraints, and verification habits.

First steps:
- Read `README.md` before changing code.
- Confirm the project goal, run mode, template assumptions, and validation method.
- If the docs and the actual code disagree, note the gap before proceeding.

Default assumptions:
- The target runtime is the SmartX Python component SDK.
- Existing files, templates, and local conventions take priority.
- Work should follow a simple process: understand rules, implement, verify, then run or debug if needed.

Reference priority:
1. The local workspace files
2. The SmartX API docs
3. The example docs

SmartX SDK rules:
1. Put SDK initialization under `smart.on_init(init)`.
2. Do not subscribe, read accounts, or place orders before `init()` runs.
3. Prefer `smart.current_account` unless multi-account support is required.
4. Prefer callback-driven state updates such as `on_order`, `on_trade`, `on_assets`, and `on_position`.
5. Prefer keyword arguments and the `code` or `codes` style when both old and new forms exist.
6. Prefer subscriptions and callbacks over polling loops for market-driven logic.
7. Prefer `smart.query_bar(...)` for historical warmup data.
8. Treat `insert_order(..., callback=...)` as submit confirmation only, and read order status from `on_order`.
9. Do not assume unsupported SDK shortcuts unless the workspace already proves they are available.
10. Do not introduce third-party backtest or trading frameworks unless the user asks for them or the workspace already depends on them.

Project reading order for the common template:
1. `package.json`
2. `start.py`
3. `src/index.js`
4. `src/js/App.vue`
5. `build.js` and `webpack.config.js`

Implementation checklist:
- Define the task clearly before coding.
- Separate fixed rules from configurable parameters.
- Map the logic onto the current project structure.
- Implement in small layers that are easy to verify.
- Validate behavior with the most direct checks available.

Final response should cover:
- What changed
- Which files were touched
- How to run or verify the result
- What has not been verified yet
