import { useCallback, useEffect, useMemo, useState } from "react"
import { workflowApi, workspaceChatApi } from "@/api/modules"
import { useChatEvents } from "@/hooks/use-chat-events"
import { useChatSessionDetail } from "@/hooks/use-chat-session-detail"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import type { PromptInputMessage } from "@/types/chat"
import type { WorkflowNodeRun, WorkflowRuntimeDetail } from "@/types/workflow"
import type { WorkspaceSnapshot, WorkspaceStatus } from "@/types/workspace-chat"

function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === "string" && err) return err
  return fallback
}

function current(box: WorkspaceSnapshot | null): WorkspaceStatus {
  return box?.state.status || "idle"
}

function model(box: WorkspaceSnapshot | null) {
  const pid = box?.state.model_provider_id?.trim()
  const mid = box?.state.model_id?.trim()
  if (!pid || !mid) return ""
  return `${pid}/${mid}`
}

function ref(value: string) {
  const [pid, ...rest] = value.split("/")
  const mid = rest.join("/").trim()
  if (!pid?.trim() || !mid) return
  return {
    model_provider_id: pid.trim(),
    model_id: mid,
  }
}

export function useStrategyWorkflowChat(path?: string | null) {
  const chat = useChatSessions(path)
  const [box, setBox] = useState<WorkspaceSnapshot | null>(null)
  const [flow, setFlow] = useState<WorkflowRuntimeDetail | null>(null)
  const [rows, setRows] = useState<WorkflowNodeRun[]>([])
  const [load, setLoad] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [send, setSend] = useState(false)
  const [hold, setHold] = useState(false)
  const [stop, setStop] = useState(false)

  const sid = box?.state.session_id ?? null
  const mid = model(box)
  const variant = box?.state.variant || null
  useChatEvents(path)
  const detail = useChatSessionDetail(path, sid)
  const state = current(box)

  const pull = useCallback(
    async (soft?: boolean) => {
      if (!path) return
      if (!soft) setLoad(true)

      try {
        const next = await workspaceChatApi.getState(path)
        const jobs = []

        if (next.run?.id) {
          jobs.push(
            workflowApi.nodeRuns(next.run.id).then((item) => {
              setRows(item.items)
            }),
          )
        } else {
          setRows([])
        }

        if (next.state.workflow_id) {
          jobs.push(
            workflowApi
              .get(next.state.workflow_id)
              .then(setFlow)
              .catch(() => setFlow(null)),
          )
      } else {
          setFlow(null)
        }

        await Promise.all(jobs)
        setBox(next)
        setErr(null)
      } catch (err) {
        setErr(note(err, "加载固定工作流状态失败"))
      } finally {
        if (!soft) setLoad(false)
      }
    },
    [path],
  )

  useEffect(() => {
    void pull()
  }, [pull])

  useEffect(() => {
    if (!box?.state.session_id) return
    if (chat.selectedSessionId === box.state.session_id) return
    chat.selectSession(box.state.session_id)
  }, [box?.state.session_id, chat])

  useEffect(() => {
    if (state !== "running" && state !== "blocked") return
    const timer = window.setInterval(() => {
      void pull(true)
    }, 3000)
    return () => {
      window.clearInterval(timer)
    }
  }, [pull, state])

  const submit = useCallback(
    async (msg: PromptInputMessage) => {
      if (!path) return
      const input = msg.text.trim()
      if (!input) return

      setSend(true)
      try {
        const next = await workspaceChatApi.dispatch({
          workspace_path: path,
          input,
        })
        setBox(next)
        if (next.state.session_id) {
          chat.selectSession(next.state.session_id)
        }
        await pull(true)
      } finally {
        setSend(false)
      }
    },
    [chat, path, pull],
  )

  const cont = useCallback(async () => {
    if (!path) return
    setHold(true)
    try {
      const next = await workspaceChatApi.continue({
        workspace_path: path,
      })
      setBox(next)
      await pull(true)
    } finally {
      setHold(false)
    }
  }, [path, pull])

  const interrupt = useCallback(async () => {
    if (!path) return
    setStop(true)
    try {
      const next = await workspaceChatApi.interrupt({
        workspace_path: path,
      })
      setBox(next)
      await pull(true)
    } finally {
      setStop(false)
    }
  }, [path, pull])

  const save = useCallback(
    (input: { model?: string; variant?: string | null }) => {
      if (!path) return
      const wid = box?.state.workflow_id?.trim()
      if (!wid) return
      const pick = ref(input.model ?? mid)
      const next = input.variant === undefined ? variant : input.variant
      setErr(null)
      void (async () => {
        try {
          const row = await workspaceChatApi.bind({
            workspace_path: path,
            workflow_id: wid,
            ...pick,
            variant: next || "",
          })
          setBox(row)
        } catch (err) {
          setErr(note(err, "保存工作流默认模型失败"))
        }
      })()
    },
    [box?.state.workflow_id, mid, path, variant],
  )

  const setModel = useCallback(
    (value: string) => {
      if (!ref(value)) return
      save({ model: value, variant: "" })
    },
    [save],
  )

  const setVariant = useCallback(
    (value: string) => {
      save({ variant: value === "default" ? null : value })
    },
    [save],
  )

  return useMemo(
    () => ({
      sessions: chat.sessions,
      selectedSessionId: sid,
      sessionLoading: chat.loading,
      creating: chat.creating,
      detailLoading: detail.loading,
      messages: detail.messages,
      status: detail.status,
      eventErr: detail.eventErr,
      state: box?.state ?? null,
      model: mid,
      variant,
      run: box?.run ?? null,
      flow,
      rows,
      phase: state,
      load,
      err,
      sending: send,
      continuing: hold,
      interrupting: stop,
      submit,
      continue: cont,
      interrupt,
      setModel,
      setVariant,
      refresh: pull,
    }),
    [
      box?.run,
      box?.state,
      chat.creating,
      chat.loading,
      chat.sessions,
      cont,
      detail.eventErr,
      detail.loading,
      detail.messages,
      detail.status,
      err,
      flow,
      hold,
      load,
      mid,
      pull,
      rows,
      setModel,
      setVariant,
      send,
      sid,
      state,
      stop,
      submit,
      variant,
    ],
  )
}
