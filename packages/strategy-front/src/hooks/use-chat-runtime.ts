import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { chatApi, permissionApi, questionApi } from "@/api/modules"
import { toast } from "sonner"
import { buildRequestParts } from "@/lib/build-request-parts"
import { log } from "@/lib/error"
import { load, save } from "@/lib/store"
import {
  selectPermissionLoaded,
  selectQuestionLoaded,
  selectSessionPermissionRequest,
  selectSessionQuestionRequest,
  selectSessionTodoData,
  selectSessionTodos,
  useAppDispatch,
  useAppSelector,
} from "@/store"
import {
  applyWorkspaceEvent,
  hydrateSessionMessages,
  setPendingPermissions,
  setPendingQuestions,
  setSessionStatus,
  setSessionTodos,
} from "@/store/chat-session-slice"
import type {
  ChatEvent,
  ChatQuestionAnswer,
  ChatSessionSummary,
  ChatStatus,
  ChatTodo,
  PermissionRequest,
  PromptInputMessage,
} from "@/types/chat"

type Input = {
  workspacePath?: string | null
  sessionId?: string | null
  status: ChatStatus
  busy?: boolean
  createSession: () => Promise<string>
  selectSession: (sessionId: string) => void
}

type DraftEntry = {
  draft?: string
  sessions?: Record<string, string | undefined>
}

type LegacyDraftEntry = DraftEntry & {
  session?: Record<string, string | undefined>
}

const storageKey = "strategy-front.session-draft.v1"

function parse(data: string) {
  if (!data) return
  try {
    const evt = JSON.parse(data) as {
      type?: string
      properties?: unknown
    }
    if (!evt.type) return
    return evt as ChatEvent
  } catch {
    return
  }
}

function path(base: string) {
  if (base.endsWith("/")) {
    return `${base}event`
  }
  return `${base}/event`
}

const sessions: ChatSessionSummary[] = []

function readDrafts() {
  if (typeof window === "undefined") return {}

  try {
    const raw = load(storageKey)
    if (!raw) return {}

    const data = JSON.parse(raw) as Record<string, LegacyDraftEntry>
    return Object.fromEntries(
      Object.entries(data).map(([path, item]) => [
        path,
        {
          draft: item.draft,
          sessions: item.sessions ?? item.session,
        },
      ]),
    ) as Record<string, DraftEntry>
  } catch {
    return {}
  }
}

function writeDrafts(store: Record<string, DraftEntry>) {
  if (typeof window === "undefined") return
  save(storageKey, JSON.stringify(store))
}

function done(list: { status: string }[]) {
  return list.length > 0 && list.every((item) => item.status === "completed" || item.status === "cancelled")
}

function active(list: { status: string }[]) {
  return list.filter((item) => item.status !== "completed" && item.status !== "cancelled")
}

function pick(list: { content: string; status: string }[]) {
  return (
    list.find((item) => item.status === "in_progress") ??
    list.find((item) => item.status === "pending") ??
    [...list].reverse().find((item) => item.status === "completed") ??
    list[0]
  )
}

function useEvents(workspacePath?: string | null) {
  const dispatch = useAppDispatch()
  const list = useAppSelector((state) => (workspacePath ? (state.chatSession.sessions[workspacePath] ?? sessions) : sessions))
  const key = useRef("")

  useEffect(() => {
    if (!workspacePath || typeof window === "undefined") {
      return
    }

    const base = import.meta.env.VITE_OPENCODE_BASE_URL || "/opencode"
    const url = new URL(path(base), window.location.origin)
    url.searchParams.set("directory", workspacePath)

    const src = new EventSource(url)
    src.onmessage = (msg) => {
      // 数据格式 data: {"type":"server.heartbeat","properties":{}}
      const event = parse(msg.data)
      if (!event) return
      dispatch(applyWorkspaceEvent({ workspace: workspacePath, event }))
    }

    return () => {
      src.close()
    }
  }, [dispatch, workspacePath])

  useEffect(() => {
    if (!workspacePath || list.length === 0) return
    const ids = list.map((item) => item.id).join("\0")
    if (key.current === ids) return
    key.current = ids
    void chatApi.getSessionStatus(workspacePath).then((status) => {
      dispatch(setSessionStatus({ sessions: list.map((item) => item.id), status }))
    })
  }, [dispatch, list, workspacePath])
}

function useDraft(workspacePath?: string | null, sessionId?: string | null) {
  const [store, setStore] = useState<Record<string, DraftEntry>>(() => readDrafts())
  const entry = workspacePath ? (store[workspacePath] ?? {}) : {}
  const text = sessionId ? (entry.sessions?.[sessionId] ?? entry.draft ?? "") : (entry.draft ?? "")

  useEffect(() => {
    writeDrafts(store)
  }, [store])

  const setText = useCallback(
    (text: string) => {
      if (!workspacePath) return
      setStore((prev) => ({
        ...prev,
        [workspacePath]: sessionId
          ? {
              ...prev[workspacePath],
              sessions: {
                ...(prev[workspacePath]?.sessions ?? {}),
                [sessionId]: text,
              },
            }
          : {
              ...prev[workspacePath],
              draft: text,
            },
      }))
    },
    [sessionId, workspacePath],
  )

  return useMemo(
    () => ({
      text,
      setText,
      clear() {
        setText("")
      },
    }),
    [setText, text],
  )
}

function usePermission(workspacePath?: string | null, sessionId?: string | null) {
  const dispatch = useAppDispatch()
  const [sending, setSending] = useState(false)
  const loaded = useAppSelector(selectPermissionLoaded)
  const req = useAppSelector((state) => selectSessionPermissionRequest(state, workspacePath, sessionId))

  const refresh = useCallback(async () => {
    if (!workspacePath) return
    const items = await permissionApi.list().catch(() => [] as PermissionRequest[])
    dispatch(setPendingPermissions({ items }))
  }, [dispatch, workspacePath])

  useEffect(() => {
    if (!workspacePath || loaded) return
    void refresh()
  }, [loaded, refresh, workspacePath])

  const reply = useCallback(
    async (item: PermissionRequest, value: "once" | "always" | "reject") => {
      if (!workspacePath || sending) return
      setSending(true)
      try {
        await permissionApi.respond(item.id, { reply: value })
        dispatch(
          applyWorkspaceEvent({
            workspace: workspacePath,
            event: {
              type: "permission.replied",
              properties: {
                sessionID: item.sessionID,
                requestID: item.id,
                reply: value,
              },
            },
          }),
        )
      } finally {
        setSending(false)
      }
    },
    [dispatch, sending, workspacePath],
  )

  const allow = useCallback(
    async (value: "once" | "always" | "reject") => {
      if (!req) return
      await reply(req, value)
    },
    [reply, req],
  )

  return useMemo(
    () => ({
      req,
      sending,
      allow,
      refresh,
    }),
    [allow, refresh, req, sending],
  )
}

function useQuestion(workspacePath?: string | null, sessionId?: string | null) {
  const dispatch = useAppDispatch()
  const [sending, setSending] = useState(false)
  const loaded = useAppSelector(selectQuestionLoaded)
  const req = useAppSelector((state) => selectSessionQuestionRequest(state, workspacePath, sessionId))

  const refresh = useCallback(async () => {
    if (!workspacePath) return
    const items = await questionApi.list().catch(() => [])
    dispatch(setPendingQuestions({ items }))
  }, [dispatch, workspacePath])

  useEffect(() => {
    if (!workspacePath || loaded) return
    void refresh()
  }, [loaded, refresh, workspacePath])

  const reply = useCallback(
    async (answers: ChatQuestionAnswer[]) => {
      if (!req || !workspacePath || sending) return
      setSending(true)
      try {
        await questionApi.reply(req.id, answers)
        await refresh()
      } finally {
        setSending(false)
      }
    },
    [refresh, req, sending, workspacePath],
  )

  const reject = useCallback(async () => {
    if (!req || !workspacePath || sending) return
    setSending(true)
    try {
      await questionApi.reject(req.id)
      await refresh()
    } finally {
      setSending(false)
    }
  }, [refresh, req, sending, workspacePath])

  return useMemo(
    () => ({
      req,
      sending,
      reply,
      reject,
    }),
    [reject, reply, req, sending],
  )
}

function useTodo(workspacePath?: string | null, sessionId?: string | null, live = false) {
  const dispatch = useAppDispatch()
  const data = useAppSelector((state) => selectSessionTodoData(state, sessionId))
  const todos = useAppSelector((state) => selectSessionTodos(state, sessionId))
  const loading = !!workspacePath && !!sessionId && data === undefined

  useEffect(() => {
    if (!workspacePath || !sessionId) {
      return
    }
    if (data !== undefined) {
      return
    }

    let dead = false

    chatApi
      .getSessionTodos(workspacePath, sessionId)
      .catch(() => [] as ChatTodo[])
      .then((todos) => {
        if (dead) {
          return
        }
        dispatch(setSessionTodos({ sessionId, todos }))
      })

    return () => {
      dead = true
    }
  }, [data, dispatch, sessionId, workspacePath])

  const complete = useMemo(() => done(todos), [todos])
  const items = useMemo(() => active(todos), [todos])
  const item = useMemo(() => pick(todos), [todos])

  return useMemo(
    () => ({
      todos,
      loading,
      done: complete,
      visible: items.length > 0,
      collapsed: !live || complete,
      preview: item?.content ?? "",
    }),
    [complete, item?.content, items.length, live, loading, todos],
  )
}

function useSubmit(input: {
  workspacePath?: string | null
  sessionId?: string | null
  createSession: () => Promise<string>
  selectSession: (sessionId: string) => void
  onSubmitted?: () => void
}) {
  const dispatch = useAppDispatch()
  const [submitting, setSubmitting] = useState(false)

  const submit = useCallback(
    async (msg: PromptInputMessage) => {
      if (!input.workspacePath) {
        return
      }

      const parts = buildRequestParts(msg)
      if (parts.length === 0) {
        return
      }

      setSubmitting(true)
      try {
        const created = !input.sessionId
        const sessionId = input.sessionId ?? (await input.createSession())
        if (created) {
          dispatch(hydrateSessionMessages({ sessionId, records: [] }))
        }
        input.selectSession(sessionId)
        await chatApi.sendPrompt(input.workspacePath, sessionId, { parts })
        input.onSubmitted?.()
      } finally {
        setSubmitting(false)
      }
    },
    [dispatch, input],
  )

  return {
    submitting,
    submit,
  }
}

export function useChatRuntime(input: Input) {
  useEvents(input.workspacePath)

  const draft = useDraft(input.workspacePath, input.sessionId)
  const permission = usePermission(input.workspacePath, input.sessionId)
  const question = useQuestion(input.workspacePath, input.sessionId)
  const busy = input.busy ?? (!!input.sessionId && input.status.type !== "idle")
  const live = busy || !!permission.req || !!question.req
  const todo = useTodo(input.workspacePath, input.sessionId, live)
  const prompt = useSubmit({
    workspacePath: input.workspacePath,
    sessionId: input.sessionId,
    createSession: input.createSession,
    selectSession: input.selectSession,
    onSubmitted: draft.clear,
  })

  const submit = useCallback(
    async (msg: PromptInputMessage) => {
      try {
        await prompt.submit(msg)

        return true
      } catch (err) {
        log("提交会话消息失败", err)
        toast.error("发送消息失败")
        return false
      }
    },
    [prompt],
  )

  return useMemo(
    () => ({
      busy,
      live,
      draft,
      permission,
      question,
      todo,
      submitting: prompt.submitting,
      submit,
    }),
    [busy, draft, live, permission, prompt.submitting, question, submit, todo],
  )
}
