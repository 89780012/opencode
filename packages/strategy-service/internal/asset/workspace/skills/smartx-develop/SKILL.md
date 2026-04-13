---
name: smartx-develop
description: SmartX development guidance for analysis, implementation, debugging, and verification.
---

# SmartX Develop

Use this skill when the user wants to analyze, implement, debug, review, or improve code in a SmartX workspace.

Start here:
- Read `README.md`.
- Confirm the product goal, run mode, template assumptions, and verification path.
- Call out mismatches between docs and the real code before coding.

Default assumptions:
- The target environment is the SmartX Python component SDK.
- Local files and existing conventions override generic habits.
- Development should follow a simple process: understand the rules, plan briefly, implement, and verify.

Reference order:
1. Local workspace files
2. SmartX API docs
3. Example docs

SDK rules:
1. Put SDK initialization under `smart.on_init(init)`.
2. Avoid account access, subscriptions, or order placement before `init()` runs.
3. Prefer `smart.current_account` unless multi-account support is needed.
4. Prefer callback-driven state updates such as `on_order`, `on_trade`, `on_assets`, and `on_position`.
5. Prefer supported keyword forms and current parameter names.
6. Prefer subscriptions and callbacks over polling loops.
7. Prefer `smart.query_bar(...)` for historical warmup.
8. Treat `insert_order(..., callback=...)` as submit confirmation only.
9. Do not assume unavailable SDK APIs without evidence in the workspace.
10. Avoid adding third-party trading frameworks unless required.

Suggested implementation order:
1. Configuration and parameters
2. Market data input
3. Indicators or core calculations
4. Signal generation
5. Position control
6. Order placement
7. Risk controls
8. Persistence if needed
9. Runtime integration

Verification checklist:
- The code runs
- The callbacks are registered correctly
- The implementation matches the intended rules
- Unsupported SDK APIs are not used
- Major constraints and risks are documented
