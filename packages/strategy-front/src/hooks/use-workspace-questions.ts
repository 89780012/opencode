import { useCallback, useEffect, useMemo, useState } from "react"
import { workspaceQuestionApi } from "@/api/modules/question"
import { log, note } from "@/lib/error"

const loads = new Map<string, Promise<QuestionEntry[]>>()

export interface QuestionEntry {
  sessionId: string
  messageId: string
  text: string
  createdAt: number
}

interface RemoteEntry {
  sessionId: string
  messageId: string
  text: string
  createdAt?: number
}

interface AppendInput {
  sessionId: string
  messageId: string
  text: string
}

function shape(item: RemoteEntry): QuestionEntry {
  return {
    sessionId: item.sessionId,
    messageId: item.messageId,
    text: item.text,
    createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
  }
}

async function read(workspacePath: string) {
  const cur = loads.get(workspacePath)
  if (cur) return cur

  const task = workspaceQuestionApi
    .list(workspacePath)
    .then((entries) => entries.map(shape))
    .catch(() => [] as QuestionEntry[])

  loads.set(workspacePath, task)
  try {
    return await task
  } finally {
    if (loads.get(workspacePath) === task) loads.delete(workspacePath)
  }
}

export function useWorkspaceQuestions(workspacePath?: string | null) {
  const [questions, setQuestions] = useState<QuestionEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!workspacePath) {
      setQuestions([])
      setLoaded(true)
      setErr(null)
      return
    }

    setBusy(true)
    try {
      const data = await read(workspacePath)
      setQuestions(data)
      setErr(null)
    } catch (err) {
      log("读取工作区问题记录失败", err)
      setQuestions([])
      setErr(note(err, "读取问题记录失败"))
    } finally {
      setLoaded(true)
      setBusy(false)
    }
  }, [workspacePath])

  useEffect(() => {
    setLoaded(false)
    setQuestions([])
    setErr(null)
  }, [workspacePath])

  const append = useCallback(
    async (input: AppendInput) => {
      if (!workspacePath) {
        return
      }

      const row = await workspaceQuestionApi.append({
        workspacePath,
        sessionId: input.sessionId,
        messageId: input.messageId,
        text: input.text,
      })

      setQuestions((list) => [shape(row), ...list])
      setLoaded(true)
      setErr(null)
    },
    [workspacePath],
  )

  const reset = useCallback(() => {
    setQuestions([])
    setLoaded(false)
    setErr(null)
  }, [])

  return useMemo(
    () => ({
      questions,
      loaded,
      busy,
      err,
      refresh,
      append,
      reset,
    }),
    [append, busy, err, loaded, questions, refresh, reset],
  )
}
