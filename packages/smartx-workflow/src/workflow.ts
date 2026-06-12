export type Step = {
  name: string
  run: () => boolean | Promise<boolean>
}

export function step(name: string, run: Step["run"]): Step {
  return { name, run }
}

export async function flow(list: Step[]) {
  for (const item of list) {
    if (await item.run()) return true
  }
  return false
}
