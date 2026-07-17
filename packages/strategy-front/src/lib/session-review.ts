type Info = {
  agent: string
  time: { completed?: number }
}

type Part = {
  type: string
  agent?: string
}

export function task(agent: string, description: string) {
  if (agent === "strategy-reviewer") return { title: "策略审查", review: true }
  return { title: description, meta: agent, review: false }
}

export function review(infos: Info[], parts: Part[]) {
  const active =
    infos.some((item) => item.agent === "strategy-reviewer") ||
    parts.some((item) => item.type === "subtask" && item.agent === "strategy-reviewer")
  if (!active) return
  const done = infos.length > 0 && infos.every((item) => !!item.time.completed)
  return done
    ? {
        done,
        title: "已调用 task",
        meta: "策略审查",
        detail: "审查结果正在保存，主智能体将按审查意见修复代码。",
      }
    : { done, title: "正在调用 task", meta: "策略审查", detail: "正在逐项核对需求与策略实现。" }
}
