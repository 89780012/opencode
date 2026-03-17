#!/usr/bin/env bun

import { $ } from "bun"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const self = fileURLToPath(import.meta.url)
const dir = path.dirname(self)
const root = path.resolve(dir, "..")
const repo = path.resolve(root, "..", "..")
const front = path.join(repo, "packages", "strategy-front")
const web = path.join(root, "internal", "http", "dist", "www")
const out = path.join(root, "dist")
const cache = path.join(root, ".cache", "go-build")
const arg = process.argv.find((x) => x.startsWith("--target="))?.slice("--target=".length)
const all = process.argv.includes("--all")

const targets = [
  {
    id: "windows-x64",
    goos: "windows",
    goarch: "amd64",
    ext: ".exe",
  },
]

const list = all ? targets : arg ? targets.filter((item) => item.id === arg) : [targets[0]]
if (!list.length) {
  throw new Error(`unknown target: ${arg}`)
}

console.log("building strategy-front")
await $`bun run build`.cwd(front)

console.log("staging embedded frontend")
await fs.rm(web, { force: true, recursive: true })
await fs.mkdir(path.dirname(web), { recursive: true })
await fs.cp(path.join(front, "dist"), web, { recursive: true })

console.log("building strategy-service")
await fs.rm(out, { force: true, recursive: true })
await fs.mkdir(out, { recursive: true })
await fs.mkdir(cache, { recursive: true })

for (const item of list) {
  const bin = path.join(out, item.id, `strategy-service${item.ext}`)
  await fs.mkdir(path.dirname(bin), { recursive: true })
  console.log(`go build ${item.id}`)
  await $`go build -o ${bin} .`.cwd(root).env({
    ...process.env,
    CGO_ENABLED: "0",
    GOCACHE: process.env.GOCACHE || cache,
    GOARCH: item.goarch,
    GOOS: item.goos,
  })
}

console.log("done")
