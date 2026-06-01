import { useMemo } from "react"
import { selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import {
  backtestFinish,
  backtestStart,
  create as add,
  remove as drop,
  rename as edit,
  reviewFinish,
  reviewStart,
  reviewStep,
  send as post,
  setActive,
  showBacktest,
  toggle as fold,
  view as flip,
} from "@/store/workbench-slice"
import { createReviewSteps } from "../data"
import { sleep } from "../lib"

const time = () => new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })

export function useWorkbench(setRight?: (open: boolean) => void) {
  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)

  const cur = useMemo(
    () => state.sessions.find((item) => item.id === state.active) ?? state.sessions[0],
    [state.active, state.sessions],
  )
  const issues = useMemo(
    () =>
      state.sessions.flatMap((item) =>
        item.messages
          .filter((msg) => msg.role === "user")
          .map((msg) => ({ sid: item.id, name: item.name, body: msg.body })),
      ),
    [state.sessions],
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

  const review = async () => {
    if (cur.reviewStatus === "running") return

    const id = state.active
    const round = cur.reviewHistory.length + 1

    dispatch(reviewStart({ id, round, steps: createReviewSteps() }))
    setRight?.(true)

    for (let i = 0; i < 6; i += 1) {
      await sleep(160)
      dispatch(reviewStep({ id, idx: i, status: "running" }))
      await sleep(220)
      dispatch(reviewStep({ id, idx: i, status: i === 3 || i === 4 ? "error" : "done" }))
    }

    dispatch(reviewFinish({ id, round, time: time() }))
  }

  const send = (text: string, start = false) => {
    const body = text.trim()
    if (!body) return

    dispatch(post({ body, start }))

    if (start) void review()
  }

  const backtest = async () => {
    if (cur.backtestStatus === "running") return

    const id = state.active
    dispatch(backtestStart(id))
    await sleep(650)
    dispatch(backtestFinish({ id, time: time() }))
  }

  const create = (data: { title: string; reqs: string[] }) => {
    dispatch(add({ ...data, id: `sess-${Date.now()}` }))
    setRight?.(true)
  }

  const rename = (id: string) => {
    const item = state.sessions.find((entry) => entry.id === id)
    if (!item) return
    const name = window.prompt("新名称", item.name)?.trim()
    if (!name) return

    dispatch(edit({ id, name }))
  }

  const remove = (id: string) => {
    if (state.sessions.length === 1) return
    if (!window.confirm("确定删除这个策略会话吗？")) return

    dispatch(drop(id))
  }

  return {
    sessions: state.sessions,
    active: state.active,
    stage: state.stage,
    cur,
    issues,
    last,
    risk,
    hint,
    setActive: (id: string) => dispatch(setActive(id)),
    toggle: (key: string) => dispatch(fold(key)),
    send,
    review,
    backtest,
    show: (idx: number) => dispatch(showBacktest({ id: state.active, idx })),
    create,
    rename,
    remove,
    view: () => dispatch(flip()),
  }
}
