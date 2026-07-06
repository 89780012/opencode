# Bootstrap Task: Fill Project Development Guidelines

**You (the AI) are running this task. The developer does not read this file.**

The developer just ran `trellis init` on this project for the first time.
`.trellis/` now exists with empty spec scaffolding, and this bootstrap task
exists under `.trellis/tasks/`. When they want to work on it, they should start
this task from a session that provides Trellis session identity.

**Your job**: help them populate `.trellis/spec/` with the team's real
coding conventions. Every future AI session — this project's
`trellis-implement` and `trellis-check` sub-agents — auto-loads spec files
listed in per-task jsonl manifests. Empty spec = sub-agents write generic
code. Real spec = sub-agents match the team's actual patterns.

Don't dump instructions. Open with a short greeting, figure out if the repo
has any existing convention docs (CLAUDE.md, .cursorrules, etc.), and drive
the rest conversationally.

---

## Status (update the checkboxes as you complete each item)

- [ ] Fill guidelines for @opencode-ai/app
- [ ] Fill guidelines for console
- [ ] Fill guidelines for containers
- [ ] Fill guidelines for @opencode-ai/desktop
- [ ] Fill guidelines for @opencode-ai/desktop-electron
- [ ] Fill guidelines for docs
- [ ] Fill guidelines for @opencode-ai/enterprise
- [ ] Fill guidelines for extensions
- [ ] Fill guidelines for @opencode-ai/function
- [ ] Fill guidelines for identity
- [ ] Fill guidelines for opencode
- [ ] Fill guidelines for @opencode-ai/plugin
- [ ] Fill guidelines for @opencode-ai/script
- [ ] Fill guidelines for sdk
- [ ] Fill guidelines for @opencode-ai/slack
- [ ] Fill guidelines for @opencode-ai/smartx-workflow
- [ ] Fill guidelines for @opencode-ai/storybook
- [ ] Fill guidelines for front
- [ ] Fill guidelines for strategy-service
- [ ] Fill guidelines for @opencode-ai/ui
- [ ] Fill guidelines for @opencode-ai/util
- [ ] Fill guidelines for @opencode-ai/web
- [ ] Fill guidelines for @opencode-ai/console-app
- [ ] Fill guidelines for @opencode-ai/console-core
- [ ] Fill guidelines for @opencode-ai/console-function
- [ ] Fill guidelines for @opencode-ai/console-mail
- [ ] Fill guidelines for @opencode-ai/console-resource
- [ ] Fill guidelines for @opencode-ai/sdk
- [ ] Add code examples

---

## Spec files to populate

### Package: @opencode-ai/app (`spec/app/`)

- Backend guidelines: `.trellis/spec/app/backend/`

- Frontend guidelines: `.trellis/spec/app/frontend/`

### Package: console (`spec/console/`)

- Backend guidelines: `.trellis/spec/console/backend/`

- Frontend guidelines: `.trellis/spec/console/frontend/`

### Package: containers (`spec/containers/`)

- Backend guidelines: `.trellis/spec/containers/backend/`

- Frontend guidelines: `.trellis/spec/containers/frontend/`

### Package: @opencode-ai/desktop (`spec/desktop/`)

- Frontend guidelines: `.trellis/spec/desktop/frontend/`

### Package: @opencode-ai/desktop-electron (`spec/desktop-electron/`)

- Frontend guidelines: `.trellis/spec/desktop-electron/frontend/`

### Package: docs (`spec/docs/`)

- Backend guidelines: `.trellis/spec/docs/backend/`

- Frontend guidelines: `.trellis/spec/docs/frontend/`

### Package: @opencode-ai/enterprise (`spec/enterprise/`)

- Backend guidelines: `.trellis/spec/enterprise/backend/`

- Frontend guidelines: `.trellis/spec/enterprise/frontend/`

### Package: extensions (`spec/extensions/`)

- Backend guidelines: `.trellis/spec/extensions/backend/`

- Frontend guidelines: `.trellis/spec/extensions/frontend/`

### Package: @opencode-ai/function (`spec/function/`)

- Backend guidelines: `.trellis/spec/function/backend/`

- Frontend guidelines: `.trellis/spec/function/frontend/`

### Package: identity (`spec/identity/`)

- Backend guidelines: `.trellis/spec/identity/backend/`

- Frontend guidelines: `.trellis/spec/identity/frontend/`

### Package: opencode (`spec/opencode/`)

- Backend guidelines: `.trellis/spec/opencode/backend/`

- Frontend guidelines: `.trellis/spec/opencode/frontend/`

### Package: @opencode-ai/plugin (`spec/plugin/`)

- Backend guidelines: `.trellis/spec/plugin/backend/`

- Frontend guidelines: `.trellis/spec/plugin/frontend/`

### Package: @opencode-ai/script (`spec/script/`)

- Backend guidelines: `.trellis/spec/script/backend/`

- Frontend guidelines: `.trellis/spec/script/frontend/`

### Package: sdk (`spec/sdk/`)

- Backend guidelines: `.trellis/spec/sdk/backend/`

- Frontend guidelines: `.trellis/spec/sdk/frontend/`

### Package: @opencode-ai/slack (`spec/slack/`)

- Backend guidelines: `.trellis/spec/slack/backend/`

- Frontend guidelines: `.trellis/spec/slack/frontend/`

### Package: @opencode-ai/smartx-workflow (`spec/smartx-workflow/`)

- Backend guidelines: `.trellis/spec/smartx-workflow/backend/`

- Frontend guidelines: `.trellis/spec/smartx-workflow/frontend/`

### Package: @opencode-ai/storybook (`spec/storybook/`)

- Frontend guidelines: `.trellis/spec/storybook/frontend/`

### Package: front (`spec/front/`)

- Frontend guidelines: `.trellis/spec/front/frontend/`

### Package: strategy-service (`spec/strategy-service/`)

- Backend guidelines: `.trellis/spec/strategy-service/backend/`

### Package: @opencode-ai/ui (`spec/ui/`)

- Frontend guidelines: `.trellis/spec/ui/frontend/`

### Package: @opencode-ai/util (`spec/util/`)

- Frontend guidelines: `.trellis/spec/util/frontend/`

### Package: @opencode-ai/web (`spec/web/`)

- Frontend guidelines: `.trellis/spec/web/frontend/`

### Package: @opencode-ai/console-app (`spec/console-app/`)

- Frontend guidelines: `.trellis/spec/console-app/frontend/`

### Package: @opencode-ai/console-core (`spec/console-core/`)

- Frontend guidelines: `.trellis/spec/console-core/frontend/`

### Package: @opencode-ai/console-function (`spec/console-function/`)

- Backend guidelines: `.trellis/spec/console-function/backend/`

- Frontend guidelines: `.trellis/spec/console-function/frontend/`

### Package: @opencode-ai/console-mail (`spec/console-mail/`)

- Frontend guidelines: `.trellis/spec/console-mail/frontend/`

### Package: @opencode-ai/console-resource (`spec/console-resource/`)

- Frontend guidelines: `.trellis/spec/console-resource/frontend/`

### Package: @opencode-ai/sdk (`spec/sdk/`)

- Backend guidelines: `.trellis/spec/sdk/backend/`

- Frontend guidelines: `.trellis/spec/sdk/frontend/`


### Thinking guides (already populated)

`.trellis/spec/guides/` contains general thinking guides pre-filled with
best practices. Customize only if something clearly doesn't fit this project.

---

## How to fill the spec

### Step 1: Import from existing convention files first (preferred)

Search the repo for existing convention docs. If any exist, read them and
extract the relevant rules into the matching `.trellis/spec/` files —
usually much faster than documenting from scratch.

| File / Directory | Tool |
|------|------|
| `CLAUDE.md` / `CLAUDE.local.md` | Claude Code |
| `AGENTS.md` | Codex / Claude Code / agent-compatible tools |
| `.cursorrules` | Cursor |
| `.cursor/rules/*.mdc` | Cursor (rules directory) |
| `.windsurfrules` | Windsurf |
| `.clinerules` | Cline |
| `.roomodes` | Roo Code |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.vscode/settings.json` → `github.copilot.chat.codeGeneration.instructions` | VS Code Copilot |
| `CONVENTIONS.md` / `.aider.conf.yml` | aider |
| `CONTRIBUTING.md` | General project conventions |
| `.editorconfig` | Editor formatting rules |

### Step 2: Analyze the codebase for anything not covered by existing docs

Scan real code to discover patterns. Before writing each spec file:
- Find 2-3 real examples of each pattern in the codebase.
- Reference real file paths (not hypothetical ones).
- Document anti-patterns the team clearly avoids.

### Step 3: Document reality, not ideals

**Critical**: write what the code *actually does*, not what it should do.
Sub-agents match the spec, so aspirational patterns that don't exist in the
codebase will cause sub-agents to write code that looks out of place.

If the team has known tech debt, document the current state — improvement
is a separate conversation, not a bootstrap concern.

---

## Quick explainer of the runtime (share when they ask "why do we need spec at all")

- Every AI coding task spawns two sub-agents: `trellis-implement` (writes
  code) and `trellis-check` (verifies quality).
- Each task has `implement.jsonl` / `check.jsonl` manifests listing which
  spec files to load.
- The platform hook auto-injects those spec files + the task's `prd.md`
  into every sub-agent prompt, so the sub-agent codes/reviews per team
  conventions without anyone pasting them manually.
- Source of truth: `.trellis/spec/`. That's why filling it well now pays
  off forever.

---

## Completion

When the developer confirms the checklist items above are done with real
examples (not placeholders), guide them to run:

```bash
python ./.trellis/scripts/task.py finish
python ./.trellis/scripts/task.py archive 00-bootstrap-guidelines
```

After archive, every new developer who joins this project will get a
`00-join-<slug>` onboarding task instead of this bootstrap task.

---

## Suggested opening line

"Welcome to Trellis! Your init just set me up to help you fill the project
spec — a one-time setup so every future AI session follows the team's
conventions instead of writing generic code. Before we start, do you have
any existing convention docs (CLAUDE.md, .cursorrules, CONTRIBUTING.md,
etc.) I can pull from, or should I scan the codebase from scratch?"
