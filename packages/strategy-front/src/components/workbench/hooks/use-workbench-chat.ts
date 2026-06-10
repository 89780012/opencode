import { useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { useStrategySession } from "@/hooks/use-strategy-session"
import { useWorkspaceEntry } from "@/hooks/use-workspace-entry"
import { log } from "@/lib/error"
import { useAppDispatch, useAppSelector } from "@/store"
import { updateSessionAbortStatus } from "@/store/chat-session-slice"

export function useWorkbenchChat() {
  const dispatch = useAppDispatch()
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""
  const entry = useWorkspaceEntry(path) //主要做工作区初始化
  const workspace = entry.workspace
  const chat = useStrategySession(workspace?.path)
  const active = useAppSelector((state) =>
    workspace?.path && state.workbench.sessionPath === workspace.path ? state.workbench.active : "",
  )
  const init = useRef<string | null>(null)

  useEffect(() => {
    if (init.current === workspace?.path) return
    init.current = null
  }, [workspace?.path])

  useEffect(() => {
    if (!workspace?.path) return
    if (!active) return
    if (chat.selectedSessionId === active) return
    chat.selectSession(active)
  }, [active, chat, workspace?.path])

  useEffect(() => {
    if (!workspace?.path) return
    if (!chat.loaded) return
    if (chat.creating) return
    if (init.current === workspace.path) return

    init.current = workspace.path
    if (chat.sessions.length > 0) {
      const item = chat.sessions[0]
      if (item && chat.selectedSessionId !== item.id) {
        chat.selectSession(item.id)
      }
      return
    }

    void chat.createSession().catch((err) => {
      init.current = null
      log("自动创建工作台会话失败", err)
      toast.error("自动创建会话失败")
    })
  }, [chat, workspace?.path])

  const abort = async () => {
    dispatch(updateSessionAbortStatus({ sessionId: chat.selectedSessionId || "", status: true }))
    await chat.abortSession().catch((err) => {
      log("停止工作台会话失败", err)
      toast.error("停止会话失败")
    })
  }

  return {
    abort,
    chat,
    entry,
    path,
    workspace,
  }
}

export type WorkbenchChat = ReturnType<typeof useWorkbenchChat>
