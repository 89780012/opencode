#!/usr/bin/env bun

import { $ } from "bun"
import path from "path"
import { fileURLToPath } from "url"

const self = fileURLToPath(import.meta.url)
const dir = path.dirname(self)
const root = path.resolve(dir, "..")
const args = process.argv.slice(2)
const channel = "stable"
const version = "0.1.0"

console.log(`packaging strategy-service prod ${version}`)
await $`bun ${path.join(dir, "package.ts")} ${args}`.cwd(root).env({
  ...process.env,
  STRATEGY_CHANNEL: channel,
  STRATEGY_VERSION: version,
})
