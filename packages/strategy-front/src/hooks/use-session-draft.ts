import { useCallback, useEffect, useMemo, useState } from "react"

type DraftEntry = {
  draft?: string
  sessions?: Record<string, string | undefined>
}

type LegacyDraftEntry = DraftEntry & {
  session?: Record<string, string | undefined>
}

const storageKey = "strategy-front.session-draft.v1"

// 读取本地草稿，并把旧版的 session 字段归一化为 sessions，避免升级后丢失历史输入。
function readDrafts() {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(storageKey)
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

// 草稿只保存在浏览器本地，状态变化后直接回写 localStorage。
function writeDrafts(store: Record<string, DraftEntry>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(storageKey, JSON.stringify(store))
}

// 统一管理输入框草稿：未进入会话时按工作区保存，进入会话后按 session 保存。
export function useSessionDraft(workspacePath?: string | null, sessionID?: string | null) {
  const [store, setStore] = useState<Record<string, DraftEntry>>(() => readDrafts())
  const workspaceDraft = workspacePath ? (store[workspacePath] ?? {}) : {}
  // 进入会话后优先读取会话草稿；还没有会话时，回退到工作区级默认草稿。
  const text = sessionID ? (workspaceDraft.sessions?.[sessionID] ?? workspaceDraft.draft ?? "") : (workspaceDraft.draft ?? "")

  useEffect(() => {
    writeDrafts(store)
  }, [store])

  const setText = useCallback(
    (next: string) => {
      if (!workspacePath) return
      // 未创建会话前先写工作区草稿；进入会话后再切到会话级草稿，避免输入中断。
      setStore((prev) => ({
        ...prev,
        [workspacePath]: sessionID
          ? {
              ...prev[workspacePath],
              sessions: {
                ...(prev[workspacePath]?.sessions ?? {}),
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
      text,
      setText,
      clear() {
        setText("")
      },
    }),
    [setText, text],
  )
}
