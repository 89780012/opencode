import { useEffect, useMemo, useRef } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { useWorkspaceList } from "@/data/global-data-provider"
import { useStrategySession } from "@/hooks/use-strategy-session"
import { log } from "@/lib/error"
import { decodeStrategyPath } from "@/lib/strategy-path"
import { useAppDispatch } from "@/store"
import { updateSessionAbortStatus } from "@/store/chat-session-slice"

export function useWorkbenchChat() {
  const dispatch = useAppDispatch()
  const params = useParams()
  const query = params.strategyID ? decodeStrategyPath(params.strategyID) : ""
  const list = useWorkspaceList()
  const workspace = useMemo(() => {
    if (query) {
      return list.workspaces.find((item) => item.path === query) ?? null
    }
    return list.selected ?? list.workspaces.find((item) => !item.missing) ?? null
  }, [list.selected, list.workspaces, query])
  const chat = useStrategySession(workspace?.path)
  const init = useRef<string | null>(null)

  useEffect(() => {
    if (!workspace) return
    list.select(workspace)
  }, [list, workspace])

  useEffect(() => {
    if (init.current === workspace?.path) return
    init.current = null
  }, [workspace?.path])

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
    list,
    workspace,
  }
}

export type WorkbenchChat = ReturnType<typeof useWorkbenchChat>
