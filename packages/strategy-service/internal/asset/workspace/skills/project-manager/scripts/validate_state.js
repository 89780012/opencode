import fs from "node:fs"
import path from "node:path"

const files = ["feature-list.json", "progress.md", "session-log.md", "state.json"]
const task = ["id", "name", "description", "status", "priority", "dependencies"]
const taskStatus = new Set(["pending", "in-progress", "done", "blocked"])
const stateStatus = new Set(["pending", "in-progress", "done", "blocked", "running", "ready"])

const fail = (msg) => {
  console.error(`[error] ${msg}`)
  process.exit(1)
}

const ok = (msg) => console.log(`[ok] ${msg}`)

const root = path.resolve(process.argv[2] || process.cwd())
const dir = path.join(root, ".project-state")

if (!fs.existsSync(dir)) fail(`missing .project-state at ${dir}`)

const miss = files.filter((name) => !fs.existsSync(path.join(dir, name)))
if (miss.length) fail(`missing files: ${miss.join(", ")}`)
ok("project-state files exist")

const feature = JSON.parse(fs.readFileSync(path.join(dir, "feature-list.json"), "utf8"))
if (!feature || typeof feature !== "object") fail("feature-list.json must be an object")
if (typeof feature.project !== "string" || !feature.project.trim()) fail("feature-list.json.project is required")
if (typeof feature.created !== "string" || !feature.created.trim()) fail("feature-list.json.created is required")
if (!Array.isArray(feature.features)) fail("feature-list.json.features must be an array")

feature.features.forEach((item, i) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) fail(`feature ${i + 1} must be an object`)
  const miss = task.filter((key) => !(key in item))
  if (miss.length) fail(`feature ${i + 1} missing fields: ${miss.join(", ")}`)
  if (!taskStatus.has(item.status)) fail(`feature ${i + 1} has invalid status: ${item.status}`)
  if (!Array.isArray(item.dependencies)) fail(`feature ${i + 1}.dependencies must be an array`)
})
ok("feature-list.json is valid")

const state = JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8"))
if (!state || typeof state !== "object") fail("state.json must be an object")
if (typeof state.phase !== "string" || !state.phase.trim()) fail("state.json.phase is required")
if (typeof state.status !== "string" || !stateStatus.has(state.status)) fail(`state.json.status is invalid: ${state.status}`)
if (typeof state.current !== "string" || !state.current.trim()) fail("state.json.current is required")
if (!Array.isArray(state.next)) fail("state.json.next must be an array")
if (!Array.isArray(state.risks)) fail("state.json.risks must be an array")
if (typeof state.verified !== "boolean") fail("state.json.verified must be a boolean")
if (typeof state.dirty !== "boolean") fail("state.json.dirty must be a boolean")
if (typeof state.updated_at !== "number") fail("state.json.updated_at must be a number")
ok("state.json is valid")

const progress = fs.readFileSync(path.join(dir, "progress.md"), "utf8").trim()
if (!progress) fail("progress.md cannot be empty")
if (!/^#/m.test(progress)) fail("progress.md should contain at least one markdown heading")
ok("progress.md is non-empty")

const log = fs.readFileSync(path.join(dir, "session-log.md"), "utf8").trim()
if (!log) fail("session-log.md cannot be empty")
if (!/^##\s+/m.test(log)) fail("session-log.md should contain at least one section heading")
ok("session-log.md is non-empty")

console.log("[done] project state validation passed")
