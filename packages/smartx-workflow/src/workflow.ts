export type Step = {
  name: string
  run: () => boolean | Promise<boolean>
}

/** 创建一个具名步骤，便于按顺序串联工作流。 */
export function step(name: string, run: Step["run"]): Step {
  return { name, run }
}

/** 依次执行步骤，命中第一个返回 true 的步骤后立即停止。 */
export async function flow(list: Step[]) {
  for (const item of list) {
    if (await item.run()) return true
  }
  return false
}
