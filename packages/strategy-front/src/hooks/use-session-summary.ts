import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { summaryApi } from "@/api/modules/summary"
import { log } from "@/lib/error"
import { selectSessionEventError, selectSessionStatus, useAppSelector } from "@/store"
import type { ChatMessageInfo } from "@/types/chat"
import type { SessionSummary } from "@/types/summary"

type Input = {
  workspacePath?: string | null
  sessionId?: string | null
  messages: ChatMessageInfo[]
  busy: boolean
  model?: string
  variant?: string
  isAbort: boolean
}

const empty = (workspacePath = "", sessionId = ""): SessionSummary => ({
  workspacePath,
  sessionId,
  state: "empty",
  messageCount: 0,
  updatedAt: 0,
})

// 模型拆解
function ref(model?: string) {
  if (!model) return
  const [providerID, ...rest] = model.split("/")
  const modelID = rest.join("/")
  if (!providerID || !modelID) return
  return { providerID, modelID }
}

export function useSessionSummary(input: Input) {
  const [item, setItem] = useState<SessionSummary>(() => empty(input.workspacePath ?? "", input.sessionId ?? ""))
  const [load, setLoad] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const flag = useRef({ busy: false, live: false, sent: "" })
  const model = ref(input.model)
  const evt = useAppSelector((state) => selectSessionEventError(state, item.summarySessionId))
  const status = useAppSelector((state) => selectSessionStatus(state, item.summarySessionId))
  const count = input.messages.length
  const isAbort = input.isAbort

  const refresh = useCallback(async () => {
    if (!input.workspacePath || !input.sessionId) {
      setItem(empty(input.workspacePath ?? "", input.sessionId ?? ""))
      return
    }
    setLoad(true)
    setErr(null)
    try {
      setItem(await summaryApi.get(input.workspacePath, input.sessionId))
    } catch (e) {
      log("加载会话总结失败", e)
      setErr(e instanceof Error ? e.message : "加载总结失败")
    } finally {
      setLoad(false)
    }
  }, [input.sessionId, input.workspacePath, setItem])

  const run = useCallback(async () => {
    if (!input.workspacePath || !input.sessionId || !model) return
    setLoad(true)
    setErr(null)
    try {
      setItem(
        await summaryApi.run({
          workspacePath: input.workspacePath,
          sessionId: input.sessionId,
          providerID: model.providerID,
          modelID: model.modelID,
          variant: input.variant,
        }),
      )
    } catch (e) {
      log("生成会话总结失败", e)
      setErr(e instanceof Error ? e.message : "生成总结失败")
    } finally {
      setLoad(false)
    }
  }, [input.sessionId, input.variant, input.workspacePath, model?.modelID, model?.providerID, setItem])

  const stop = useCallback(async () => {
    if (!input.workspacePath || !input.sessionId) return
    setLoad(true)
    setErr(null)
    try {
      await summaryApi.stop(input.workspacePath, input.sessionId)
    } catch (e) {
      log("打断会话总结失败", e)
      setErr(e instanceof Error ? e.message : "打断总结失败")
    } finally {
      setLoad(false)
    }
  }, [input.sessionId, input.workspacePath])

  useEffect(() => {
    flag.current = { busy: false, live: false, sent: "" }
    void refresh()
  }, [refresh])

  useEffect(() => {
    //如果是打断的，则不需要总结
    console.log("isAbort", isAbort)
    if (isAbort) return

    if (input.busy) {
      flag.current.busy = true
      return
    }
    if (!flag.current.busy) return

    const key = `${input.workspacePath}\u0000${input.sessionId}\u0000${count}`
    if (flag.current.sent === key) return
    flag.current.sent = key
    void run()
  }, [count, input.busy, input.sessionId, input.workspacePath, run])

  useEffect(() => {
    if (item.state !== "running") {
      flag.current.live = false
      return
    }
    if (status.type !== "idle") {
      flag.current.live = true
      if (status.type === "retry") setErr(status.message)
      return
    }
    if (!flag.current.live) return
    flag.current.live = false
    void refresh()
  }, [item.state, refresh, status])

  useEffect(() => {
    if (item.state !== "running" || !evt) return
    setItem({ ...item, state: "error", err: evt, updatedAt: Date.now() })
    toast.error(evt)
  }, [setItem, evt, item])

  return useMemo(
    () => ({
      item,
      load,
      err,
      ready: !input.busy,
      refresh,
      run,
      stop,
    }),
    [err, input.busy, item, load, refresh, run, stop],
  )
}
