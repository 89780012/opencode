#!/usr/bin/env bun

import { $ } from "bun"
import { createHash } from "crypto"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { front } from "./front"

const self = fileURLToPath(import.meta.url)
const dir = path.dirname(self)
const root = path.resolve(dir, "..")
const out = path.join(root, "dist")
const cache = path.join(root, ".cache", "go-build")
const args = process.argv.slice(2)
const want = args.find((x) => x.startsWith("--target="))?.slice("--target=".length)
const list = args.includes("--list")
const skip = args.includes("--skip-front")
const clean = args.includes("--clean")

const targets = [
  { id: "windows-x64", goos: "windows", goarch: "amd64", ext: ".exe" },
  { id: "windows-arm64", goos: "windows", goarch: "arm64", ext: ".exe" },
  { id: "linux-x64", goos: "linux", goarch: "amd64", ext: "" },
  { id: "linux-arm64", goos: "linux", goarch: "arm64", ext: "" },
  { id: "darwin-x64", goos: "darwin", goarch: "amd64", ext: "" },
  { id: "darwin-arm64", goos: "darwin", goarch: "arm64", ext: "" },
]

if (list) {
  console.log(targets.map((item) => `${item.id} (${item.goos}/${item.goarch})`).join("\n"))
  process.exit(0)
}

const jobs = want ? targets.filter((item) => item.id === want) : targets
if (!jobs.length) {
  throw new Error(`unknown target: ${want}`)
}

console.log(`targets: ${jobs.map((item) => item.id).join(", ")}`)

await front(root, skip)

console.log("building strategy-service")
if (clean) {
  await fs.rm(out, { force: true, recursive: true })
}
await fs.mkdir(out, { recursive: true })
await fs.mkdir(cache, { recursive: true })

const sums = []
const built = []

for (const item of jobs) {
  const dir = path.join(out, item.id)
  const bin = path.join(dir, `strategy-service${item.ext}`)
  await fs.rm(dir, { force: true, recursive: true })
  await fs.mkdir(dir, { recursive: true })
  console.log(`go build ${item.id}`)
  await $`go build -o ${bin} ./cmd/service`.cwd(root).env({
    ...process.env,
    CGO_ENABLED: "0",
    GOCACHE: process.env.GOCACHE || cache,
    GOARCH: item.goarch,
    GOOS: item.goos,
  })
  const sum = await hash(bin)
  await stageRuntime(root, dir, item.id)
  await fs.writeFile(`${bin}.sha256`, `${sum}  ${path.basename(bin)}\n`)
  sums.push(`${sum}  ${slash(path.relative(out, bin))}`)
  built.push({
    id: item.id,
    goos: item.goos,
    goarch: item.goarch,
    path: slash(path.relative(root, bin)),
    sha256: sum,
  })
}

await fs.writeFile(path.join(out, "SHA256SUMS"), sums.join("\n") + "\n")
await fs.writeFile(
  path.join(out, "manifest.json"),
  JSON.stringify(
    {
      targets: built,
    },
    null,
    2,
  ) + "\n",
)

console.log("done")

async function hash(file: string) {
  return createHash("sha256")
    .update(new Uint8Array(await Bun.file(file).arrayBuffer()))
    .digest("hex")
}

function slash(file: string) {
  return file.replaceAll("\\", "/")
}

async function stageRuntime(root: string, dir: string, id: string) {
  const src = path.join(root, "runtime", id)
  const dst = path.join(dir, "runtime")
  const stat = await fs.stat(src).catch(() => null)
  if (!stat?.isDirectory()) {
    return
  }

  await fs.rm(dst, { force: true, recursive: true })
  await fs.cp(src, dst, { recursive: true })
}
