---
name: strategy-service
description: Built-in workspace skill provisioned by strategy-service.
---

# Strategy Service

This workspace was prepared by `strategy-service`.

Use this skill when the user wants to write, modify, backtest, or review a trading strategy in this workspace.
Treat strategy writing as a structured workflow, not a one-shot code generation task.
Prefer existing project files, local conventions, and reusable components before creating new files.
Assume the target runtime is the SmartX Python component SDK shown in the local `start.py` shape and SDK docs, not a generic Python quant framework.

Use these SmartX docs whenever you need to write APIs accurately or debug SDK behavior:

- API reference: `https://smarttest.ztqft.com/sdkDoc/python/1.0.0/api/pythonApi.html`
- Example/demo: `https://smarttest.ztqft.com/sdkDoc/python/1.0.0/example/pythonApiExample.html`

Before writing or changing Smart API calls:

- open the API reference and match the exact method name, callback name, enum, and parameter form
- use the demo to copy the expected lifecycle and event wiring style

When Smart code errors or behaves unexpectedly:

- check the API reference before guessing field names or callback signatures
- check the demo before inventing a new event flow or account-access pattern

If this workspace was bootstrapped from the built-in `plugin_python` template, inspect the template in this order:

- `package.json`: plugin metadata, build script, and workspace identity
- `start.py`: Python strategy entrypoint and Smart callbacks
- `src/index.js`: frontend boot path and Python launch hook
- `src/js/App.vue`: default UI composition
- `build.js` and `webpack.config.js`: packaging flow

Treat root `index.js` and `index.html` as generated or runtime-facing outputs by default. Prefer editing source files under `src/` and the Python entrypoint unless the user explicitly asks to modify generated assets.

When first entering a template-based workspace, summarize the project as:

- plugin metadata and expected runtime
- Python execution flow
- frontend execution flow
- build path
- which files are source-of-truth versus generated output

## SmartX SDK Rules

These rules override generic strategy-writing habits.

1. Respect the component lifecycle.
All Smart initialization must hang off `smart.on_init(init)`.
Do not place subscriptions, account reads, or order placement at import time.

2. Write for the account object first.
Prefer `smart.current_account` for single-account work and `smart.account_map` only when the task clearly needs multi-account logic.
Prefer account callbacks such as `smart.current_account.on_order(...)`, `on_trade(...)`, `on_assets(...)`, and `on_position(...)`.

3. Prefer the current SDK calling style.
Use keyword arguments and `code` / `codes` inputs over older positional forms when both are available.
When placing orders, prefer `smart.insert_order(code="000001.SZ", ...)` or the equivalent keyword form already used in the workspace.

4. Use the SDK event model instead of polling.
For quote-driven logic, subscribe and react in callbacks.
For bar-driven logic, use `smart.subscribe_bar(...)`, `smart.on_bar(...)`, or `smart.on(smart.Event.ON_BAR, ...)`.
For historical warmup, use `smart.query_bar(...)` before computing indicators.

5. Treat submit callbacks and order callbacks differently.
`insert_order(..., callback=...)` confirms submit success or failure.
Order lifecycle changes must still be handled from `on_order`.

6. Do not invent unsupported Smart APIs.
Assume strategy-level `strategy.insert_order`, `strategy.subscribe`, and similar helpers are unavailable in SDK `1.0.0` unless the workspace already proves they exist.
Do not import `backtrader`, `vnpy`, `ccxt`, or similar frameworks unless the user explicitly asks or the workspace already depends on them.

7. Keep generated code close to the template.
If the workspace comes from `plugin_python`, prefer editing `start.py` and existing `src/` files instead of introducing a new package layout.
Add helper functions only when they clearly reduce duplication or make the event flow easier to reason about.

## Core Rules

1. Inspect the workspace first.
Look for existing strategy code, backtest code, config files, data adapters, and execution entrypoints before proposing new structure.

2. Clarify the strategy before coding.
If key inputs are missing, ask for them briefly or infer the safest default and state the assumption.

3. Separate idea, implementation, and validation.
Do not jump from a vague idea straight into final code without defining rules, parameters, and test expectations.

4. Always include risk controls.
A strategy is incomplete if it has entries and exits but no position sizing, stop conditions, or invalidation rules.

5. Backtest before claiming completion.
If the repo supports backtesting, use it. If it does not, explain what is missing and what should be verified next.

6. Match SmartX names exactly.
Before using an enum, field, or callback name, verify it against existing code or SDK docs.
Do not guess names such as order status, side constants, exchange constants, or event names.
If needed, reopen the API reference and demo above before editing.

## Standard Workflow For Writing A Strategy

When the user asks to write a strategy, follow this order:

### Step 1: Define the trading problem

Collect or infer:

- market: A-share, ETF, futures, options, or another Smart-supported market
- symbol set: one symbol or a basket
- timeframe: quote, tick, 1m, 5m, 1h, daily
- venue: Smart client / SmartX environment / local simulator
- execution style: live trading, paper trading, replay, backtest only
- direction: long only, short only, both

If any of these are unknown, identify the missing fields before implementation.

### Step 2: Define the strategy rules precisely

Write the logic in plain language first:

- entry conditions
- add-to-position conditions
- exit conditions
- stop-loss conditions
- take-profit conditions
- cooldown or re-entry rules
- capital allocation rules

Do not write code until these rules are explicit enough to simulate.

### Step 3: Define the parameter set

Separate fixed rules from tunable parameters.

Typical parameters:

- lookback windows
- thresholds
- leverage
- order size
- max positions
- slippage assumptions
- fee assumptions
- risk limits

### Step 4: Map the code structure

Before editing, identify:

- where strategy classes or functions live
- where indicators are computed
- where orders are created
- where portfolio state is stored
- where Smart callbacks are registered
- where historical data is queried
- where config is loaded

Prefer extending the existing structure instead of inventing a new mini-framework.

### Step 5: Implement in small layers

Recommended implementation order:

1. config and parameters
2. market data inputs
3. indicator or level calculation
4. signal generation
5. position sizing
6. order generation
7. risk controls
8. state persistence if needed
9. backtest wiring

### Step 6: Validate behavior

Check:

- does it compile or run
- does it produce trades
- do entry and exit rules match the spec
- does it register the right Smart callbacks
- does it avoid using unsupported SDK APIs
- are fees and slippage considered
- does position size stay within limits
- does the strategy break on edge cases such as flat markets, gaps, partial fills, or duplicate signals

### Step 7: Summarize the result

At the end, report:

- what was implemented
- key assumptions
- main parameters
- major risks
- what should be tested next

## Python Grid Strategy Workflow

If the user asks for a Python grid strategy, use this exact workflow.
Default to the SmartX component style shown in the SDK demo: quote subscription plus account callbacks, with explicit per-symbol state.

### Step 1: Clarify the grid type

Determine:

- spot grid or futures grid
- neutral grid, long grid, or short grid
- arithmetic grid or geometric grid
- static range or dynamic range
- one-shot deployment or continuously re-centered grid

If the user only says "write a Python grid strategy", default to:

- spot
- long-only neutral grid
- arithmetic grid
- fixed price range

State these defaults explicitly.

### Step 2: Collect the required parameters

Minimum required inputs:

- symbol
- timeframe or candle frequency
- upper price bound
- lower price bound
- grid count
- total capital
- per-grid order sizing rule
- fee rate

Strongly recommended inputs:

- rebalance rule
- stop-loss rule
- take-profit or shutdown rule
- max holding time
- max drawdown guard

### Step 3: Express the strategy in plain language

Describe the grid logic before coding:

- divide the price range into N grid levels
- place buy orders below the current price
- place sell orders above the current price
- when a buy fills, place the paired sell at the next higher grid
- when a sell fills, place the paired buy at the next lower grid
- stop trading if price leaves the allowed range or a risk guard triggers

### Step 4: Design the Python components

For a Python grid strategy, prefer this structure:

- config model
- grid builder
- strategy state
- signal or order planner
- Smart callback wiring
- execution adapter
- result report

If the workspace already has equivalent modules, reuse them instead of introducing new names.

### Step 5: Implement in this order

1. define the config schema
2. build the grid price levels
3. track current inventory and cash
4. implement order placement logic
5. implement fill handling
6. implement paired order regeneration
7. implement range-break handling
8. implement fee and slippage accounting
9. implement logging and operator visibility

### Step 6: Validate the grid strategy

Verify at least these cases:

- price oscillates inside the grid
- price trends upward through the range
- price trends downward through the range
- price gaps beyond the upper or lower bound
- repeated fills do not create duplicate paired orders
- inventory does not exceed configured limits
- submit callback failure does not corrupt pending state
- `on_order` updates keep local state consistent with exchange reality

### Step 7: Report strategy quality

For a grid strategy, always discuss:

- capital utilization
- inventory risk
- trend risk
- fee sensitivity
- sensitivity to grid density
- what happens when price leaves the range

## Output Expectations

When working on a strategy task in this workspace:

- present assumptions clearly
- keep implementation steps ordered
- show the exact files changed
- explain which Smart callbacks and subscriptions were added or changed
- explain how to run or backtest the result
- identify what remains unverified

## Do Not

- do not invent strategy rules the user did not ask for without labeling them as assumptions
- do not skip risk controls
- do not claim profitability from code inspection alone
- do not bypass existing project structure unless it is clearly broken
- do not write Smart-dependent code outside the `smart.on_init(init)` lifecycle
- do not replace callback-driven logic with `while True` polling unless the user explicitly asks for it
