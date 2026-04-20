import fs from "node:fs"
import path from "node:path"

const req = ["project", "created", "features"]
const task = ["id", "name", "description", "status", "priority", "dependencies"]
const status = new Set(["pending", "in-progress", "done", "blocked"])

const fail = (msg) => {
  console.error(`[错误] ${msg}`)
  process.exit(1)
}

const ok = (msg) => console.log(`[通过] ${msg}`)

const root = path.resolve(process.argv[2] || process.cwd())
const state = path.join(root, ".project-state")
if (!fs.existsSync(state)) fail(`未找到状态目录: ${state}`)

const files = {
  "feature-list.json": path.join(state, "feature-list.json"),
  "progress.md": path.join(state, "progress.md"),
  "session-log.md": path.join(state, "session-log.md"),
}

const miss = Object.entries(files)
  .filter(([, file]) => !fs.existsSync(file))
  .map(([name]) => name)

if (miss.length) fail(`缺少状态文件: ${miss.join(", ")}`)

ok("状态目录和基础文件存在")

let data
try {
  data = JSON.parse(fs.readFileSync(files["feature-list.json"], "utf8"))
} catch (err) {
  fail(`feature-list.json 不是合法 JSON: ${err.message}`)
}

const top = req.filter((key) => !(key in data))
if (top.length) fail(`feature-list.json 缺少字段: ${top.join(", ")}`)
if (!Array.isArray(data.features)) fail("feature-list.json 的 features 必须是数组")

data.features.forEach((item, i) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) fail(`第 ${i + 1} 个任务不是对象`)
  const miss = task.filter((key) => !(key in item))
  if (miss.length) fail(`第 ${i + 1} 个任务缺少字段: ${miss.join(", ")}`)
  if (!status.has(item.status)) fail(`第 ${i + 1} 个任务的 status 非法: ${item.status}`)
  if (!Array.isArray(item.dependencies)) fail(`第 ${i + 1} 个任务的 dependencies 必须是数组`)
})

ok("feature-list.json 结构合法")

;["progress.md", "session-log.md"].forEach((name) => {
  const text = fs.readFileSync(files[name], "utf8").trim()
  if (!text) fail(`${name} 不能为空`)
  ok(`${name} 可读取且非空`)
})

console.log("[完成] 项目状态文件校验通过")
