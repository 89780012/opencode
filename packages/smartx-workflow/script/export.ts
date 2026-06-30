import path from "node:path"
import { mkdir, rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const dir = path.join(root, "dist")
const out = path.join(dir, "smartx-workflow.js")

function ascii(text: string) {
  return text.replace(/[^\x00-\x7F]/g, (char) => {
    const point = char.codePointAt(0) ?? 0
    if (point <= 0xffff) return `\\u${point.toString(16).padStart(4, "0")}`
    return `\\u{${point.toString(16)}}`
  })
}

await rm(dir, { recursive: true, force: true })
await mkdir(dir, { recursive: true })

const build = await Bun.build({
  entrypoints: [path.join(root, "src", "index.ts")],
  target: "bun",
  format: "esm",
  bundle: true,
  sourcemap: "none",
  minify: false,
  write: false,
})

if (!build.success) {
  for (const item of build.logs) console.error(item)
  process.exit(1)
}

const file = build.outputs.find((item) => item.path.endsWith("index.js"))

if (!file) {
  console.error("smartx-workflow build output is missing")
  process.exit(1)
}

await Bun.write(out, ascii(await file.text()))
