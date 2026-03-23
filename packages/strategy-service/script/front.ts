import { $ } from "bun"
import fs from "fs/promises"
import path from "path"

export async function front(root: string, skip: boolean) {
  const repo = path.resolve(root, "..", "..")
  const dir = path.join(repo, "packages", "strategy-front")
  const web = path.join(root, "internal", "asset", "frontend", "dist", "www")

  if (!skip) {
    console.log("building strategy-front")
    await $`bun run build`.cwd(dir)
  }

  console.log("staging embedded frontend")
  await fs.rm(web, { force: true, recursive: true })
  await fs.mkdir(path.dirname(web), { recursive: true })
  await fs.cp(path.join(dir, "dist"), web, { recursive: true })
}
