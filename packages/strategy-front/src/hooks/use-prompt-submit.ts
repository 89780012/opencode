import { useCallback, useState } from "react"
import { chatApi } from "@/api/modules"
import { useAppDispatch } from "@/hooks/useAppDispatch"
import { buildRequestParts } from "@/lib/build-request-parts"
import { clearSessionEventError, hydrateSessionMessages } from "@/store/chat-session-slice"
import type { ChatModelRef } from "@/types/chat"

interface Input {
  workspacePath?: string | null
  sessionId?: string | null
  agent?: string
  model?: ChatModelRef
  variant?: string
  createSession: () => Promise<string>
  selectSession: (sessionId: string) => void
  onSubmitted?: () => void
}

export function usePromptSubmit(input: Input) {
  const dispatch = useAppDispatch()
  const [submitting, setSubmitting] = useState(false)

  const submit = useCallback(
    async (value: string) => {
      if (!input.workspacePath || !input.agent || !input.model) {
        return
      }

      const parts = buildRequestParts(value)
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
        dispatch(clearSessionEventError({ sessionId }))
        input.selectSession(sessionId)
        await chatApi.sendPrompt(input.workspacePath, sessionId, {
          agent: input.agent,
          model: input.model,
          variant: input.variant,
          parts,
        })
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
