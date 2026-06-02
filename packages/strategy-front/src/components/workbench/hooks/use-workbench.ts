import { useMemo } from "react"
import { selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import {
  backtestFinish,
  backtestStart,
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
    () => state.demo.find((session) => session.id === state.active) ?? state.demo[0],
    [state.active, state.demo],
  )
  const issues = useMemo(
    () =>
      state.demo.flatMap((session) =>
        session.messages
          .filter((msg) => msg.role === "user")
          .map((msg) => ({ sid: session.id, name: session.name, body: msg.body })),
      ),
    [state.demo],
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

  return {
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
    view: () => dispatch(flip()),
  }
}
