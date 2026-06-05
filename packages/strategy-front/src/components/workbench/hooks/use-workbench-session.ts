import { useSearchParams } from "react-router-dom"
import { socket } from "@/lib/socket-bus"
import { selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import { setActive } from "@/store/workbench-slice"
import { useWorkbenchSessionSync } from "./use-workbench-session-sync"

export function useWorkbenchSession(props?: { onCreate?: () => void }) {
  useWorkbenchSessionSync()

  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""

  const rename = (id: string) => {
    const item = state.sessions.find((entry) => entry.id === id)
    if (!item) return
    const title = window.prompt("新名称", item.title)?.trim()
    if (!title) return

    socket.emit("session.update", { id, title })
  }

  const remove = (id: string) => {
    if (state.sessions.length === 1) return
    if (!window.confirm("确定删除这个策略会话吗？")) return

    socket.emit("session.delete", { id })
  }

  const create = (title: string) => {
    if (!path) return
    socket.emit("session.create", { workspacePath: path, title })
    props?.onCreate?.()
  }

  return {
    sessions: state.sessions,
    active: state.active,
    setActive: (id: string) => dispatch(setActive(id)),
    rename,
    remove,
    create,
  }
}
