import { useCallback, useMemo, useState } from "react"
import type { ChatImageInput } from "@/types/chat"

const root = "__workspace__"

export function useSessionFiles(path?: string | null, sessionID?: string | null) {
  const [store, setStore] = useState<Record<string, Record<string, ChatImageInput[]>>>({})
  const key = sessionID ?? root

  const setFiles = useCallback(
    (next: ChatImageInput[]) => {
      if (!path) return
      setStore((prev) => ({
        ...prev,
        [path]: {
          ...(prev[path] ?? {}),
          [key]: next,
        },
      }))
    },
    [key, path],
  )

  return useMemo(
    () => ({
      files: path ? (store[path]?.[key] ?? []) : [],
      setFiles,
      clear() {
        setFiles([])
      },
    }),
    [key, path, setFiles, store],
  )
}
