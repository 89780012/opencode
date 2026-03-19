import { useCallback, useState } from "react"
import { chatApi } from "@/api/modules"
import { useAppDispatch } from "@/hooks/useAppDispatch"
import { buildRequestParts } from "@/lib/build-request-parts"
import {
  applyWorkspaceEvent,
  clearSessionError,
  setSessionStatus,
} from "@/store/chat-session-slice"
import type { ChatModelRef, ChatPart, ChatUserMessage } from "@/types/chat"

interface Input {
  workspacePath?: string | null
  sessionId?: string | null
  agent?: string
  model?: ChatModelRef
  variant?: string
  createSession: () => Promise<string>
  refreshSessions: () => Promise<void>
  refreshDetail?: (sessionId?: string | null) => Promise<void>
  selectSession: (sessionId: string) => void
  onSubmitted?: () => void
}

function rid(prefix: "msg" | "prt") {
  const rand = globalThis.crypto?.randomUUID().replaceAll("-", "") ?? Math.random().toString(36).slice(2)
  return `${prefix}_${Date.now().toString(36)}${rand}`
}

export function usePromptSubmit(input: Input) {
  const dispatch = useAppDispatch()
  const [submitting, setSubmitting] = useState(false)

  const submit = useCallback(
    async (value: string) => {
      if (!input.workspacePath || !input.agent || !input.model) {
        return
      }

      const dir = input.workspacePath
      const parts = buildRequestParts(value)
      if (parts.length === 0) {
        return
      }

      setSubmitting(true)
      let sessionId = input.sessionId
      let msg: string | undefined
      try {
        sessionId = sessionId ?? (await input.createSession())
        msg = rid("msg")
        const sid = sessionId
        const mid = msg
        const now = Date.now()
        const info: ChatUserMessage = {
          id: mid,
          sessionID: sid,
          role: "user",
          time: {
            created: now,
          },
          agent: input.agent,
          model: input.model,
          variant: input.variant,
        }
        dispatch(
          applyWorkspaceEvent({
            workspace: dir,
            event: {
              type: "message.updated",
              properties: { info },
            },
          }),
        )
        parts.forEach((item) => {
          if (item.type !== "text") return
          const part: ChatPart = {
            id: rid("prt"),
            sessionID: sid,
            messageID: mid,
            type: "text",
            text: item.text,
          }
          dispatch(
            applyWorkspaceEvent({
              workspace: dir,
              event: {
                type: "message.part.updated",
                properties: { part },
              },
            }),
          )
        })
        dispatch(setSessionStatus({ sessionId, status: { type: "busy" } }))
        dispatch(clearSessionError({ sessionId }))
        input.selectSession(sessionId)
        await chatApi.sendPrompt(dir, sessionId, {
          messageID: mid,
          agent: input.agent,
          model: input.model,
          variant: input.variant ?? "default",
          parts,
        })
        await Promise.all([
          input.refreshSessions(),
          input.refreshDetail?.(sessionId),
        ])
        input.onSubmitted?.()
      } catch (err) {
        if (sessionId && msg) {
          dispatch(
            applyWorkspaceEvent({
              workspace: dir,
              event: {
                type: "message.removed",
                properties: {
                  sessionID: sessionId,
                  messageID: msg,
                },
              },
            }),
          )
          dispatch(setSessionStatus({ sessionId, status: { type: "idle" } }))
        }
        throw err
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
