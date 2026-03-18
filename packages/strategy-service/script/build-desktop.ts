#!/usr/bin/env bun

import { $ } from "bun"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { front } from "./front"

const self = fileURLToPath(import.meta.url)
const dir = path.dirname(self)
const root = path.resolve(dir, "..")
const cmd = path.join(root, "cmd", "desktop")
const build = path.join(cmd, "build")
const dist = path.join(root, "dist", "desktop")
const args = process.argv.slice(2)
const skip = args.includes("--skip-front")
const clean = args.includes("--clean")
const pass = args.filter((x) => x !== "--skip-front" && x !== "--clean")
const mod = "github.com/wailsapp/wails/v2"
const ver = "v2.11.0"

await front(root, skip)

console.log("building strategy-service desktop")
if (clean) {
  await fs.rm(build, { force: true, recursive: true })
  await fs.rm(dist, { force: true, recursive: true })
}

const bin = Bun.which(process.platform === "win32" ? "wails.exe" : "wails") || Bun.which("wails")
if (bin) {
  await $`${bin} build ${pass}`.cwd(cmd)
} else {
  const go = Bun.which(process.platform === "win32" ? "go.exe" : "go") || Bun.which("go")
  if (!go) {
    throw new Error("wails CLI not found and go is not available in PATH")
  }
  console.log("preparing Wails CLI module")
  await $`${go} get ${mod}/cmd/wails@${ver}`.cwd(root)
  await $`${go} run github.com/wailsapp/wails/v2/cmd/wails build ${pass}`.cwd(cmd)
}

await fs.rm(dist, { force: true, recursive: true })
await fs.mkdir(path.dirname(dist), { recursive: true })
await fs.cp(path.join(build, "bin"), dist, { recursive: true })

console.log(`desktop bundle copied to ${dist}`)
