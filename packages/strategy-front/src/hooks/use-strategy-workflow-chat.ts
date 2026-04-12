import { useCallback, useEffect, useMemo, useState } from "react"
import { workflowApi, workspaceChatApi } from "@/api/modules"
import { useChatEvents } from "@/hooks/use-chat-events"
import { useChatSessionDetail } from "@/hooks/use-chat-session-detail"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { useWorkspaceChatState } from "@/hooks/use-workspace-chat-state"
import { busy as workflowBusy, note } from "@/lib/workspace-chat"
import type { PromptInputMessage } from "@/types/chat"
import type { WorkflowNodeRun, WorkflowRuntimeDetail, WorkflowWait } from "@/types/workflow"

function model(box?: { state?: { default_model_provider_id?: string; default_model_id?: string } | null } | null) {
  const pid = box?.state?.default_model_provider_id?.trim()
  const mid = box?.state?.default_model_id?.trim()
  if (!pid || !mid) return ""
  return `${pid}/${mid}`
}

function ref(value: string) {
  const [pid, ...rest] = value.split("/")
  const mid = rest.join("/").trim()
  if (!pid?.trim() || !mid) return
  return {
    default_model_provider_id: pid.trim(),
    default_model_id: mid,
  }
}

export function useStrategyWorkflowChat(path?: string | null) {
  const chat = useChatSessions(path)
  const room = useWorkspaceChatState(path)
  const [flow, setFlow] = useState<WorkflowRuntimeDetail | null>(null)
  const [rows, setRows] = useState<WorkflowNodeRun[]>([])
  const [waits, setWaits] = useState<WorkflowWait[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [send, setSend] = useState(false)
  const [replying, setReplying] = useState(false)
  const [stop, setStop] = useState(false)

  const sid = room.state?.session_id ?? null
  const mid = model(room.box)
  const variant = room.state?.default_variant || null
  useChatEvents(path)
  const detail = useChatSessionDetail(path, sid)
  const busy = workflowBusy(room.box, sid) || detail.status.type !== "idle"

  const pull = useCallback(
    async (soft?: boolean) => {
      if (!path) return

      try {
        const next = await room.refresh(soft)
        if (!next) return
        const jobs = []

        if (next.run?.id) {
          jobs.push(
            workflowApi.nodeRuns(next.run.id).then((item) => {
              setRows(item.items)
            }),
          )
          jobs.push(
            workflowApi.waits(next.run.id).then((item) => {
              setWaits(item.items)
            }),
          )
        } else {
          setRows([])
          setWaits([])
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
        setErr(null)
      } catch (err) {
        setErr(note(err, "加载工作流状态失败"))
      }
    },
    [path, room.refresh],
  )

  useEffect(() => {
    void pull()
  }, [pull])

  useEffect(() => {
    if (!room.state?.session_id) return
    if (chat.selectedSessionId === room.state.session_id) return
    chat.selectSession(room.state.session_id)
  }, [chat.selectSession, chat.selectedSessionId, room.state?.session_id])

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
        room.put(next)
        if (next.state.session_id) {
          chat.selectSession(next.state.session_id)
        }
        await pull(true)
      } finally {
        setSend(false)
      }
    },
    [chat.selectSession, path, pull, room.put],
  )

  const reply = useCallback(
    async (waitID: string, payload?: unknown) => {
      const runID = room.run?.id
      if (!runID) return
      setReplying(true)
      try {
        await workflowApi.reply(runID, {
          wait_id: waitID,
          payload,
          idempotency_key: `${Date.now()}`,
        })
        await pull(true)
      } finally {
        setReplying(false)
      }
    },
    [pull, room.run?.id],
  )

  const interrupt = useCallback(async () => {
    if (!path) return
    setStop(true)
    try {
      await room.interrupt()
      await pull(true)
    } finally {
      setStop(false)
    }
  }, [path, pull, room.interrupt])

  const save = useCallback(
    (input: { model?: string; variant?: string | null }) => {
      if (!path) return
      const wid = room.state?.workflow_id?.trim()
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
            default_variant: next || "",
          })
          room.put(row)
        } catch (err) {
          setErr(note(err, "保存工作流默认模型失败"))
        }
      })()
    },
    [mid, path, room.put, room.state?.workflow_id, variant],
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

  const openWait = useMemo(() => waits.find((item) => item.status === "open") ?? null, [waits])

  return useMemo(
    () => ({
      sessions: chat.sessions,
      selectedSessionId: sid,
      sessionLoading: chat.loading,
      creating: chat.creating,
      detailLoading: detail.loading,
      messages: detail.messages,
      status: detail.status,
      busy,
      eventErr: detail.eventErr,
      state: room.state,
      model: mid,
      variant,
      run: room.run,
      flow,
      rows,
      waits,
      openWait,
      phase: room.phase,
      load: room.load,
      err: err || room.err,
      sending: send,
      replying,
      interrupting: stop,
      submit,
      reply,
      interrupt,
      setModel,
      setVariant,
      refresh: pull,
    }),
    [
      busy,
      chat.creating,
      chat.loading,
      chat.sessions,
      detail.eventErr,
      detail.loading,
      detail.messages,
      detail.status,
      err,
      flow,
      interrupt,
      mid,
      openWait,
      pull,
      reply,
      replying,
      room.err,
      room.load,
      room.phase,
      room.run,
      room.state,
      rows,
      send,
      setModel,
      setVariant,
      sid,
      stop,
      submit,
      variant,
      waits,
    ],
  )
}
