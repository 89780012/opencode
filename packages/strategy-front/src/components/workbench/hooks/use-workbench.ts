import { useMemo, useState } from "react"
import {
  createBacktest,
  createReviewSteps,
  createSessions,
  type ReviewStatus,
  type SessionItem,
  type Stage,
  type Step,
} from "../data"
import { sleep } from "../lib"

export function useWorkbench(setRight: (open: boolean) => void) {
  const [sessions, setSessions] = useState(() => createSessions())
  const [active, setActive] = useState("sess-1")
  const [stage, setStage] = useState<Stage>("session")

  const cur = useMemo(() => sessions.find((item) => item.id === active) ?? sessions[0], [active, sessions])
  const issues = useMemo(
    () =>
      sessions.flatMap((item) =>
        item.messages
          .filter((msg) => msg.role === "user")
          .map((msg) => ({ sid: item.id, name: item.name, body: msg.body })),
      ),
    [sessions],
  )
  const last = cur.reviewHistory.at(-1) ?? null
  const risk = useMemo(() => {
    if (cur.reviewStatus === "passed") return "审查已通过"
    if (cur.reviewStatus === "failed") return "审查未通过，需要修复"
    if (cur.reviewStatus === "running") return "审查进行中"
    return "代码等待审查"
  }, [cur.reviewStatus])
  const hint = useMemo(() => {
    const list = [risk]
    if (cur.flowchartStatus === "done") list.push("流程图已生成")
    if (cur.backtestStatus === "done" && cur.backtestResults) list.push(`回测收益 ${cur.backtestResults.totalReturn}`)
    return list.join(" / ")
  }, [cur.backtestResults, cur.backtestStatus, cur.flowchartStatus, risk])

  const patch = (fn: (item: SessionItem) => SessionItem) => {
    setSessions((list) => list.map((item) => (item.id === active ? fn(item) : item)))
  }

  const copy = async () => {
    await navigator.clipboard.writeText(cur.codeContent)
  }

  const review = async () => {
    if (cur.reviewStatus === "running") return

    const next = createReviewSteps()
    const round = cur.reviewHistory.length + 1

    patch((item) => ({
      ...item,
      reviewStatus: "running",
      reviewView: "current",
      reviewRound: round,
      reviewProgress: next,
    }))
    setRight(true)

    for (let i = 0; i < next.length; i += 1) {
      await sleep(160)
      patch((item) => ({
        ...item,
        reviewProgress:
          item.reviewProgress?.map((entry, idx) => (idx === i ? { ...entry, status: "running" } : entry)) ?? null,
      }))
      await sleep(220)
      patch((item) => ({
        ...item,
        reviewProgress:
          item.reviewProgress?.map((entry, idx) =>
            idx === i ? { ...entry, status: idx === 3 || idx === 4 ? "error" : "done" } : entry,
          ) ?? null,
      }))
    }

    patch((item) => {
      const steps = item.reviewProgress ?? []
      const status: ReviewStatus = steps.some((entry) => entry.status === "error") ? "failed" : "passed"
      return {
        ...item,
        reviewStatus: status,
        reviewView: "current",
        reviewProgress: null,
        reviewHistory: [
          ...item.reviewHistory,
          {
            round,
            status,
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            steps: steps as Step[],
            suggestions: status === "failed" ? ["优先检查空仓保护", "补充最大回撤保护", "修复边界条件分支"] : [],
          },
        ],
      }
    })
  }

  const send = (text: string, start = false) => {
    const body = text.trim()
    if (!body) return

    patch((item) => ({
      ...item,
      messages: [
        ...item.messages,
        { role: "user", body },
        {
          role: "ai",
          body: start
            ? `已记录审查意见：“${body}”。下一轮审查会重点关注这个问题。`
            : `已收到修改意见：“${body}”。我会同步更新策略代码与说明。`,
        },
      ],
      codeContent: `${item.codeContent}\n\n# ${body}`,
    }))

    if (start) void review()
  }

  const backtest = async () => {
    if (cur.backtestStatus === "running") return

    setStage("backtest")
    patch((item) => ({
      ...item,
      backtestStatus: "running",
    }))
    await sleep(650)
    patch((item) => {
      const result = createBacktest()
      return {
        ...item,
        backtestStatus: "done",
        backtestResults: result,
        backtestHistory: [
          {
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            results: result,
          },
          ...item.backtestHistory,
        ],
      }
    })
  }

  const show = (idx: number) => {
    const item = cur.backtestHistory[idx]
    if (!item) return
    patch((entry) => ({
      ...entry,
      backtestResults: item.results,
      backtestStatus: "done",
    }))
    setStage("backtest")
  }

  const create = (data: { title: string; reqs: string[] }) => {
    const name = data.title.trim() || "新建策略会话"
    const reqs = data.reqs.map((item) => item.trim()).filter(Boolean)
    const item: SessionItem = {
      ...createSessions()[0],
      id: `sess-${Date.now()}`,
      name,
      currentRequirement: reqs[0] ?? "请描述你的策略需求",
      analyzedRequirements: reqs.length ? reqs : ["请描述你的策略需求"],
      messages: [
        {
          role: "ai",
          body: `会话《${name}》已创建。你可以继续补充需求，或直接发起审查。`,
        },
      ],
      reviewStatus: "idle",
      reviewRound: 0,
      reviewView: "current",
      reviewHistory: [],
      reviewProgress: null,
    }

    setSessions((list) => [item, ...list])
    setActive(item.id)
    setStage("session")
    setRight(true)
  }

  const rename = (id: string) => {
    const item = sessions.find((entry) => entry.id === id)
    if (!item) return
    const name = window.prompt("新名称", item.name)?.trim()
    if (!name) return
    setSessions((list) => list.map((entry) => (entry.id === id ? { ...entry, name } : entry)))
  }

  const remove = (id: string) => {
    if (sessions.length === 1) return
    if (!window.confirm("确定删除这个策略会话吗？")) return

    const list = sessions.filter((entry) => entry.id !== id)
    setSessions(list)
    if (active === id) setActive(list[0]?.id ?? "")
  }

  const toggle = (key: string) => {
    patch((item) => ({
      ...item,
      sections: {
        ...item.sections,
        [key]: !item.sections[key],
      },
    }))
  }

  const view = () => {
    patch((item) => ({
      ...item,
      reviewView: item.reviewView === "current" ? "history" : "current",
    }))
  }

  return {
    sessions,
    active,
    stage,
    setStage,
    cur,
    issues,
    last,
    risk,
    hint,
    setActive,
    toggle,
    copy,
    send,
    review,
    backtest,
    show,
    create,
    rename,
    remove,
    view,
  }
}
