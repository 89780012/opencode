import fs from "node:fs"
import path from "node:path"

const req = ["project", "created", "features"]
const task = ["id", "name", "description", "status", "priority", "dependencies"]
const status = new Set(["pending", "in-progress", "done", "blocked"])
const mark = ["更新时间", "当前阶段", "下一步"]
const note = ["会话目标", "执行动作", "当前结果", "下一步"]

const fail = (msg) => {
  console.error(`[错误] ${msg}`)
  process.exit(1)
}

const ok = (msg) => console.log(`[通过] ${msg}`)

const lines = (text) => text.split(/\r?\n/)

const section = (text, name) => {
  const row = lines(text)
  const i = row.findIndex((line) => line.trim() === `## ${name}`)
  if (i === -1) return
  const body = []
  for (const line of row.slice(i + 1)) {
    if (/^##\s+/.test(line.trim())) break
    body.push(line)
  }
  return body
}

const has = (row, name) =>
  row.some((line) => new RegExp(`^-\\s*${name}[：:]`).test(line.trim()))

const progress = (text) => {
  const row = lines(text).map((line) => line.trim()).filter(Boolean)
  const top = row.find((line) => /^##\s+/.test(line))
  if (top !== "## 最新状态") fail("progress.md 顶部必须先出现 `## 最新状态`")
  const body = section(text, "最新状态")
  if (!body) fail("progress.md 缺少 `## 最新状态` 段落")
  const miss = mark.filter((name) => !has(body, name))
  if (miss.length) fail(`progress.md 的“最新状态”缺少字段: ${miss.join(", ")}`)
}

const journal = (text) => {
  const row = lines(text)
  const head = row
    .map((line, i) => ({ line: line.trim(), i }))
    .filter((item) => /^##\s+/.test(item.line))
  if (!head.length) fail("session-log.md 至少要有一条 `## 时间` 记录")
  head.forEach((item, i) => {
    const name = item.line.replace(/^##\s+/, "").trim()
    if (!name) fail(`session-log.md 第 ${i + 1} 条记录缺少时间标题`)
    const end = head[i + 1]?.i ?? row.length
    const body = row.slice(item.i + 1, end)
    const miss = note.filter((name) => !has(body, name))
    if (miss.length) fail(`session-log.md 第 ${i + 1} 条记录缺少字段: ${miss.join(", ")}`)
  })
}

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

const prog = fs.readFileSync(files["progress.md"], "utf8").trim()
if (!prog) fail("progress.md 不能为空")
progress(prog)
ok("progress.md 结构合法")

const log = fs.readFileSync(files["session-log.md"], "utf8").trim()
if (!log) fail("session-log.md 不能为空")
journal(log)
ok("session-log.md 结构合法")

console.log("[完成] 项目状态文件校验通过")
