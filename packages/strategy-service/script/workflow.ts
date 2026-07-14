import { $ } from "bun"
import path from "path"

export async function workflow(root: string) {
  const dir = path.resolve(root, "../smartx-workflow")
  console.log("building smartx-workflow")
  await $`bun run build`.cwd(dir)
  if (!(await Bun.file(path.join(dir, "dist", "smartx-workflow.js")).exists())) {
    throw new Error("smartx-workflow build output is missing")
  }
}
