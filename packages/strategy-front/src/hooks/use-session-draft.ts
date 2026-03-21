import { useCallback, useEffect, useMemo, useState } from "react"

type Item = {
  draft?: string
  session?: Record<string, string | undefined>
}

const key = "strategy-front.session-draft.v1"

function parse() {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, Item>
  } catch {
    return {}
  }
}

function write(all: Record<string, Item>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(all))
}

export function useSessionDraft(workspacePath?: string | null, sessionID?: string | null) {
  const [all, setAll] = useState<Record<string, Item>>(() => parse())
  const cur = workspacePath ? (all[workspacePath] ?? {}) : {}
  const value = sessionID ? (cur.session?.[sessionID] ?? cur.draft ?? "") : (cur.draft ?? "")

  useEffect(() => {
    write(all)
  }, [all])

  const save = useCallback(
    (next: string) => {
      if (!workspacePath) return
      setAll((prev) => ({
        ...prev,
        [workspacePath]: sessionID
          ? {
              ...prev[workspacePath],
              session: {
                ...(prev[workspacePath]?.session ?? {}),
                [sessionID]: next,
              },
            }
          : {
              ...prev[workspacePath],
              draft: next,
            },
      }))
    },
    [sessionID, workspacePath],
  )

  return useMemo(
    () => ({
      value,
      setValue: save,
      clear() {
        save("")
      },
    }),
    [save, value],
  )
}
