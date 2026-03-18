#!/usr/bin/env bun

import { $ } from "bun"
import path from "path"
import { fileURLToPath } from "url"
import { front } from "./front"

const self = fileURLToPath(import.meta.url)
const dir = path.dirname(self)
const root = path.resolve(dir, "..")
const args = process.argv.slice(2)
const clean = args.includes("--clean")
const skip = args.includes("--skip-front")
const opt = clean ? ["--clean"] : []

await front(root, skip)

console.log("packaging strategy-service binaries")
await $`bun ${path.join(dir, "build.ts")} ${opt} --skip-front`.cwd(root)

console.log("packaging strategy-service desktop")
await $`bun ${path.join(dir, "build-desktop.ts")} ${opt} --skip-front`.cwd(root)

console.log("all packages built")
