import { useEffect } from "react"
import { applyWorkspaceEvent } from "@/store/chat-session-slice"
import { useAppDispatch } from "@/hooks/useAppDispatch"
import type { ChatEvent } from "@/types/chat"

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

export function useChatEvents(workspacePath?: string | null) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!workspacePath || typeof window === "undefined") {
      return
    }

    const base = import.meta.env.VITE_OPENCODE_BASE_URL || "/opencode"
    const url = new URL(path(base), window.location.origin)
    url.searchParams.set("directory", workspacePath)

    const src = new EventSource(url)
    src.onmessage = (msg) => {
      // console.log("onmessage-->", msg)
      const evt = parse(msg.data)
      if (!evt) return
      // 全局事件转发
      dispatch(applyWorkspaceEvent({ workspace: workspacePath, event: evt }))
    }

    return () => {
      src.close()
    }
  }, [dispatch, workspacePath])
}
