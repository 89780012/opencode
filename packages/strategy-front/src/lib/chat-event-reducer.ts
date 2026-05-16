import type {
  ChatEvent,
  ChatFileDiff,
  ChatMessageInfo,
  ChatMessageRecord,
  ChatPart,
  PermissionRequest,
  ChatQuestionRequest,
  ChatSessionSummary,
  ChatStatus,
  ChatTodo,
} from "@/types/chat"

export type ChatStateShape = {
  sessions: Record<string, ChatSessionSummary[]>
  loaded: Record<string, boolean>
  sessionLoading: Record<string, boolean>
  sessionCreating: Record<string, boolean>
  selected: Record<string, string | null>
  hydrated: Record<string, boolean>
  detailLoading: Record<string, boolean>
  messages: Record<string, ChatMessageInfo[]>
  parts: Record<string, ChatPart[]>
  sessionDiffs: Record<string, ChatFileDiff[] | undefined>
  todos: Record<string, ChatTodo[] | undefined>
  permissions: Record<string, PermissionRequest[]>
  permissionLoaded: boolean
  questions: Record<string, ChatQuestionRequest[]>
  questionLoaded: boolean
  status: Record<string, ChatStatus>
  // AI 消息自身携带的历史错误。它属于时间线的一部分，后续进入会话时不应被清掉。
  messageErrs: Record<string, string | undefined>
  // 运行时事件错误。典型场景是 session.error 先到达，但对应的 assistant message.error
  // 还没回流，或某些错误只以事件形式出现（例如上下文溢出触发 compaction）。
  eventErrs: Record<string, string | undefined>
  questionRecordStamp: number
}

export const idle: ChatStatus = { type: "idle" }

const sortSession = (list: ChatSessionSummary[]) => [...list].sort((a, b) => b.time.updated - a.time.updated)

const sortMsg = (list: ChatMessageInfo[]) =>
  [...list].sort((a, b) => a.time.created - b.time.created || a.id.localeCompare(b.id))

const sortPart = (list: ChatPart[]) => [...list].sort((a, b) => a.id.localeCompare(b.id))

const msgErr = (err?: { data?: Record<string, unknown> }) => {
  const txt = err?.data?.message
  return typeof txt === "string" && txt ? txt : undefined
}

const lastAssistantErr = (list: ChatMessageInfo[]) => {
  for (let i = list.length - 1; i >= 0; i--) {
    const item = list[i]
    if (item.role !== "assistant") continue
    const msg = msgErr(item.error)
    if (!msg || abortErr(msg)) return
    return msg
  }
}

const abortErr = (txt?: string) => {
  if (!txt) return false
  return txt.toLowerCase().includes("abort")
}

function add(part: ChatPart, field: string, delta: string) {
  if (field === "text" && "text" in part) {
    part.text += delta
    return
  }
  if (field === "snapshot" && "snapshot" in part) {
    part.snapshot += delta
    return
  }
  if (field === "prompt" && "prompt" in part) {
    part.prompt += delta
    return
  }
  if (field === "description" && "description" in part) {
    part.description += delta
    return
  }
  if (field === "name" && "name" in part) {
    part.name += delta
  }
}

function arraysShallowEqual<T extends { id: string }>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i] && a[i].id !== b[i].id) return false
  }
  return true
}

export function hydrateChat(state: ChatStateShape, sessionID: string, list: ChatMessageRecord[]) {
  const nextMessages = sortMsg(list.map((item) => item.info))
  const prevMessages = state.messages[sessionID]
  if (!prevMessages || !arraysShallowEqual(prevMessages, nextMessages)) {
    state.messages[sessionID] = nextMessages
  }
  state.hydrated[sessionID] = true

  list.forEach((item) => {
    const nextParts = sortPart(item.parts)
    const prevParts = state.parts[item.info.id]
    if (!prevParts || !arraysShallowEqual(prevParts, nextParts)) {
      state.parts[item.info.id] = nextParts
    }
  })

  const msg = lastAssistantErr(nextMessages)
  if (!msg) {
    delete state.messageErrs[sessionID]
  } else {
    state.messageErrs[sessionID] = msg
  }
  if (!state.status[sessionID]) {
    state.status[sessionID] = idle
  }
}

export function hydrateQuestions(state: ChatStateShape, list: ChatQuestionRequest[]) {
  state.questions = list.reduce(
    (acc, item) => {
      const cur = acc[item.sessionID] ?? []
      acc[item.sessionID] = [...cur, item].sort((a, b) => a.id.localeCompare(b.id))
      return acc
    },
    {} as Record<string, ChatQuestionRequest[]>,
  )
  state.questionLoaded = true
}

export function hydratePermissions(state: ChatStateShape, list: PermissionRequest[]) {
  state.permissions = list.reduce(
    (acc, item) => {
      const cur = acc[item.sessionID] ?? []
      acc[item.sessionID] = [...cur, item].sort((a, b) => a.id.localeCompare(b.id))
      return acc
    },
    {} as Record<string, PermissionRequest[]>,
  )
  state.permissionLoaded = true
}

export function upsertSession(state: ChatStateShape, workspace: string, info: ChatSessionSummary) {
  const list = state.sessions[workspace] ?? []
  const next = list.some((item) => item.id === info.id)
    ? list.map((item) => (item.id === info.id ? info : item))
    : [...list, info]
  state.sessions[workspace] = sortSession(next)
}

export function removeSession(state: ChatStateShape, workspace: string, info: ChatSessionSummary) {
  const list = state.sessions[workspace] ?? []
  state.sessions[workspace] = list.filter((item) => item.id !== info.id)
  if (state.selected[workspace] === info.id) {
    state.selected[workspace] = null
  }
  delete state.detailLoading[info.id]
  delete state.hydrated[info.id]
  delete state.messages[info.id]
  delete state.status[info.id]
  delete state.messageErrs[info.id]
  delete state.eventErrs[info.id]
  delete state.sessionDiffs[info.id]
  delete state.todos[info.id]
  delete state.permissions[info.id]
  delete state.questions[info.id]
}

export function applyChatEvent(state: ChatStateShape, workspace: string, evt: ChatEvent) {
  switch (evt.type) {
    case "session.created":
    case "session.updated": {
      upsertSession(state, workspace, evt.properties.info)
      return
    }
    case "session.deleted": {
      removeSession(state, workspace, evt.properties.info)
      return
    }
    case "session.diff": {
      state.sessionDiffs[evt.properties.sessionID] = evt.properties.diff
      return
    }
    case "permission.asked": {
      const req = evt.properties
      const list = state.permissions[req.sessionID] ?? []
      const next = list.some((item) => item.id === req.id)
        ? list.map((item) => (item.id === req.id ? req : item))
        : [...list, req]
      state.permissions[req.sessionID] = next.sort((a, b) => a.id.localeCompare(b.id))
      return
    }
    case "permission.replied": {
      const list = state.permissions[evt.properties.sessionID] ?? []
      const next = list.filter((item) => item.id !== evt.properties.requestID)
      if (next.length === 0) {
        delete state.permissions[evt.properties.sessionID]
        return
      }
      state.permissions[evt.properties.sessionID] = next
      return
    }
    case "session.status": {
      state.status[evt.properties.sessionID] = evt.properties.status
      if (evt.properties.status.type === "busy") {
        delete state.eventErrs[evt.properties.sessionID]
      }
      return
    }
    case "session.idle": {
      state.status[evt.properties.sessionID] = idle
      return
    }
    case "session.error": {
      if (!evt.properties.sessionID) return
      const msg = msgErr(evt.properties.error) ?? "Request failed"
      if (abortErr(msg)) {
        delete state.eventErrs[evt.properties.sessionID]
        return
      }
      state.eventErrs[evt.properties.sessionID] = msg
      return
    }
    case "message.updated": {
      const info = evt.properties.info
      const list = state.messages[info.sessionID] ?? []
      const exactMatch = list.some((item) => item.id === info.id)
      let next: ChatMessageInfo[]
      if (exactMatch) {
        next = list.map((item) => (item.id === info.id ? info : item))
      } else {
        // Check for optimistic message with client-generated ID (same role, close timestamp)
        const optimisticIdx = list.findIndex(
          (item) =>
            item.id !== info.id &&
            item.role === info.role &&
            item.id.startsWith("msg_") &&
            Math.abs(item.time.created - info.time.created) < 5000,
        )
        if (optimisticIdx >= 0) {
          // Replace optimistic message with server message, and migrate parts
          const oldId = list[optimisticIdx].id
          next = list.map((item, i) => (i === optimisticIdx ? info : item))
          // Migrate parts from client ID to server ID
          if (state.parts[oldId]) {
            if (!state.parts[info.id]) {
              state.parts[info.id] = state.parts[oldId]
            }
            delete state.parts[oldId]
          }
        } else {
          next = [...list, info]
        }
      }
      state.messages[info.sessionID] = sortMsg(next)
      const msg = lastAssistantErr(state.messages[info.sessionID])
      if (!msg) {
        delete state.messageErrs[info.sessionID]
        return
      }
      state.messageErrs[info.sessionID] = msg
      return
    }
    case "message.removed": {
      const list = state.messages[evt.properties.sessionID] ?? []
      state.messages[evt.properties.sessionID] = list.filter((item) => item.id !== evt.properties.messageID)
      delete state.parts[evt.properties.messageID]
      return
    }
    case "message.part.updated": {
      const part = evt.properties.part
      const list = state.parts[part.messageID] ?? []
      const next = list.some((item) => item.id === part.id)
        ? list.map((item) => (item.id === part.id ? part : item))
        : [...list, part]
      state.parts[part.messageID] = sortPart(next)
      return
    }
    case "message.part.removed": {
      const list = state.parts[evt.properties.messageID] ?? []
      const next = list.filter((item) => item.id !== evt.properties.partID)
      if (next.length === 0) {
        delete state.parts[evt.properties.messageID]
        return
      }
      state.parts[evt.properties.messageID] = next
      return
    }
    case "message.part.delta": {
      const list = state.parts[evt.properties.messageID]
      if (!list) return
      const idx = list.findIndex((item) => item.id === evt.properties.partID)
      if (idx < 0) return
      add(list[idx], evt.properties.field, evt.properties.delta)
      return
    }
    case "todo.updated": {
      state.todos[evt.properties.sessionID] = evt.properties.todos
      return
    }
    case "question.asked": {
      const req = evt.properties
      const list = state.questions[req.sessionID] ?? []
      const next = list.some((item) => item.id === req.id)
        ? list.map((item) => (item.id === req.id ? req : item))
        : [...list, req]
      state.questions[req.sessionID] = next.sort((a, b) => a.id.localeCompare(b.id))
      return
    }
    case "question.replied":
    case "question.rejected": {
      const list = state.questions[evt.properties.sessionID] ?? []
      const next = list.filter((item) => item.id !== evt.properties.requestID)
      if (next.length === 0) {
        delete state.questions[evt.properties.sessionID]
        return
      }
      state.questions[evt.properties.sessionID] = next
      return
    }
  }
}
