#!/usr/bin/env bun

// build-desktop.ts
// 构建 strategy-service 桌面端（Wails 应用）。
//
// 用法:
//   bun run script/build-desktop.ts [--skip-front] [--clean] [...wails flags]
//
// 参数:
//   --skip-front  跳过前端构建，直接使用已有的 strategy-front/dist
//   --clean       构建前清理 build 和 dist 目录
//   其余参数透传给 wails build
//
// 构建流程:
//   1. 构建前端并嵌入到 cmd/desktop/boot/ 目录
//   2. 优先使用系统安装的 wails CLI 构建
//   3. 若 wails CLI 不存在，则通过 go run 直接运行 wails 模块（利用 Go 模块缓存，无需每次下载）
//   4. 将产物复制到 dist/desktop/

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

// Wails 模块路径和版本，用于 go run 回退方案
const mod = "github.com/wailsapp/wails/v2"
const ver = "v2.11.0"

// 步骤 1: 构建前端资源
await front(root, skip)

// 步骤 2: 构建桌面应用
console.log("building strategy-service desktop")
if (clean) {
  await fs.rm(build, { force: true, recursive: true })
  await fs.rm(dist, { force: true, recursive: true })
}

// 优先使用系统安装的 wails CLI，否则通过 go run 回退
const bin = Bun.which(process.platform === "win32" ? "wails.exe" : "wails") || Bun.which("wails")
if (bin) {
  await $`${bin} build ${pass}`.cwd(cmd)
} else {
  const go = Bun.which(process.platform === "win32" ? "go.exe" : "go") || Bun.which("go")
  if (!go) {
    throw new Error("wails CLI not found and go is not available in PATH")
  }
  // 直接 go run module@version，Go 会自动使用模块缓存，无需 go get
  console.log("running wails via go run (using module cache)")
  await $`${go} run ${mod}/cmd/wails@${ver} build ${pass}`.cwd(cmd)
}

// 步骤 3: 将构建产物复制到 dist/desktop/
await fs.rm(dist, { force: true, recursive: true })
await fs.mkdir(path.dirname(dist), { recursive: true })
await fs.cp(path.join(build, "bin"), dist, { recursive: true })

console.log(`desktop bundle copied to ${dist}`)
