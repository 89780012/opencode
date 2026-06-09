import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { type Analyze, type Hit, workbenchApi } from "@/api/modules/workbench"
import { socket } from "@/lib/socket-bus"
import { selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import { setActive } from "@/store/workbench-slice"

const seed = "新建策略会话"
const line = ["请描述你的策略需求"]
const defs = [
  { key: "strategy", label: "策略类型", note: "决定要生成哪一类策略骨架" },
  { key: "market", label: "交易市场", note: "缺失市场会影响标的和数据接口选择" },
  { key: "direction", label: "交易方向", note: "缺失方向会影响开平仓逻辑" },
  { key: "period", label: "运行周期", note: "缺失周期会影响 K 线与调度配置" },
  { key: "entry", label: "开仓条件", note: "缺失开仓条件会影响信号生成" },
  { key: "exit", label: "平仓条件", note: "缺失平仓条件会影响离场逻辑" },
  { key: "position", label: "仓位规则", note: "缺失仓位规则会影响资金分配" },
  { key: "stop_loss", label: "止损规则", note: "缺失止损规则会削弱风险控制" },
  { key: "risk_control", label: "风控约束", note: "缺失风控约束会影响过滤和保护条件" },
  { key: "indicator", label: "指标依据", note: "缺失指标依据会影响参数和计算过程" },
  { key: "other", label: "其他约束", note: "补充特殊规则，减少生成歧义" },
] as const

type Row = {
  text: string
  tags: string[]
}

type Dim = {
  key: string
  label: string
  note: string
  list: string[]
  miss: boolean
}

function slim(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase()
}

function same(left: string, right: string) {
  const a = slim(left)
  const b = slim(right)
  if (!a || !b) return false
  return a.includes(b) || b.includes(a)
}

function take(list?: Hit[]) {
  return (list ?? []).map((item) => item.normalized_text.trim() || item.source_text.trim()).filter(Boolean)
}

function mark(text: string, dims?: Record<string, Hit[]>) {
  return defs.flatMap((item) =>
    (dims?.[item.key] ?? []).some((hit) => same(text, hit.source_text) || same(text, hit.normalized_text))
      ? [item.label]
      : [],
  )
}

function clean(list: string[]) {
  return list.map((item) => item.trim()).filter(Boolean)
}

export function useWorkbenchModal() {
  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""
  const empty = !!path && state.sessionPath === path && state.sessions.length === 0
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [shown, setShown] = useState("")
  const [title, setTitle] = useState(seed)
  const [reqs, setReqs] = useState<string[]>(line)
  const [data, setData] = useState<Analyze | null>(null)
  const [err, setErr] = useState("")

  const openModal = useCallback(() => {
    setOpen(true)
    setStep(1)
    setBusy(false)
    setTitle(seed)
    setReqs(line)
    setData(null)
    setErr("")
  }, [])

  const reset = useCallback(() => {
    setOpen(false)
    setStep(1)
    setBusy(false)
    setTitle(seed)
    setReqs(line)
    setData(null)
    setErr("")
  }, [])

  useEffect(() => {
    if (!open) return

    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [busy, open])

  useEffect(() => {
    if (!empty) {
      setShown("")
      return
    }
    if (shown === path) return
    if (open) return
    setShown(path)
    openModal()
  }, [empty, open, openModal, path, shown])

  const analyze = async (keep = false) => {
    const body = reqs
      .map((item) => item.trim())
      .filter(Boolean)
      .join("\n")
    setStep(2)
    if (!body) {
      setErr("请先填写策略需求，再进行 AI 分析。")
      setData(null)
      return
    }

    setBusy(true)
    setErr("")

    try {
      const next = await workbenchApi.identify(body)
      setData(next)
      if (!keep && next.title.trim()) {
        setTitle(next.title.trim())
      }
      setReqs(next.requirement_items.length ? next.requirement_items : reqs)
    } catch (error) {
      setData(null)
      setErr(error instanceof Error ? error.message : "AI 分析失败，请稍后重试。")
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    setErr("")
    if (step === 1) {
      await analyze()
      return
    }

    if (step === 2) {
      setStep(3)
      return
    }

    if (!create(title)) {
      setErr("创建会话请求发送失败，请检查连接后重试。")
      return
    }
    reset()
  }

  const rename = (id: string, title: string) => {
    const item = state.sessions.find((entry) => entry.id === id)
    const next = title.trim()
    if (!item || !next || next === item.title) return

    socket.emit("session.update", { id, title: next })
  }

  const remove = (id: string) => {
    socket.emit("session.delete", { id })
  }

  const create = (title: string) => {
    if (!path) return false
    return socket.emit("session.create", { workspacePath: path, title, requirements: clean(reqs), analysis: data })
  }

  const rows: Row[] = reqs.map((text) => ({
    text,
    tags: mark(text, data?.dimensions),
  }))

  const dims: Dim[] = defs.map((item) => {
    const list = take(data?.dimensions[item.key])
    return {
      key: item.key,
      label: item.label,
      note: item.note,
      list,
      miss: list.length === 0,
    }
  })

  const warn = data
    ? dims
        .filter((item) => item.miss)
        .map((item) => `未识别「${item.label}」：${item.note}，缺失可能影响后续代码生成，但你仍可以继续下一步。`)
    : []

  return {
    sessions: state.sessions,
    active: state.active,
    setActive: (id: string) => dispatch(setActive(id)),
    rename,
    remove,
    create,
    open,
    openModal,
    close: () => {
      if (busy) return
      reset()
    },
    step,
    setStep,
    busy,
    title,
    setTitle,
    reqs,
    setReqs,
    rows,
    dims,
    warn,
    err,
    data,
    analyze,
    submit,
  }
}
