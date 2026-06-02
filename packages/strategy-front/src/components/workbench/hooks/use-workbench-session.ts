import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { socket, type SocketEvent } from "@/lib/socket-bus"
import { selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import {
  deleteSession,
  setActive,
  setSessions,
  upsertSession,
  type WorkbenchSession,
} from "@/store/workbench-slice"
import { sleep } from "../lib"

function obj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
}

function parseSession(value: unknown): WorkbenchSession | null {
  if (!obj(value)) return null
  if (typeof value.id !== "string") return null
  if (typeof value.title !== "string") return null
  if (typeof value.workspacePath !== "string") return null
  return {
    id: value.id,
    title: value.title,
    workspacePath: value.workspacePath,
    session: value.session,
    createdAt: typeof value.createdAt === "number" ? value.createdAt : 0,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
  }
}

function parseSessionList(value: unknown) {
  if (!obj(value) || !Array.isArray(value.sessions)) return null
  return {
    workspacePath: typeof value.workspacePath === "string" ? value.workspacePath : "",
    sessions: value.sessions.map(parseSession).filter((session): session is WorkbenchSession => !!session),
  }
}

function parseSessionResult(value: unknown) {
  if (!obj(value)) return null
  return parseSession(value.session)
}

function parseID(value: unknown) {
  if (!obj(value)) return ""
  return typeof value.id === "string" ? value.id : ""
}

function useSessionSync() {
  const dispatch = useAppDispatch()
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""

  useEffect(() => {
    const send = () => {
      if (!path) return
      socket.emit("session.list", { workspacePath: path })
    }
    if (socket.ready()) {
      send()
    }
    return socket.on("socket.open", send)
  }, [path])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const data = parseSessionList(event.payload)
      if (!data) return
      if (data.workspacePath && data.workspacePath !== path) return
      dispatch(setSessions({ sessions: data.sessions }))
    }
    return socket.on("session.listed", fn)
  }, [dispatch, path])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const session = parseSessionResult(event.payload)
      if (!session) return
      if (session.workspacePath !== path) return
      dispatch(upsertSession({ session }))
    }
    return socket.on("session.updated", fn)
  }, [dispatch, path])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const id = parseID(event.payload)
      if (!id) return
      dispatch(deleteSession({ id }))
    }
    return socket.on("session.deleted", fn)
  }, [dispatch])

  useEffect(() => {
    const fn = () => {
      if (!path) return
      socket.emit("session.list", { workspacePath: path })
    }
    return socket.on("session.created", fn)
  }, [path])
}

export function useWorkbenchSession(props?: { onCreate?: () => void }) {
  useSessionSync()

  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState("新建策略会话")
  const [reqs, setReqs] = useState<string[]>(["请描述你的策略需求"])

  useEffect(() => {
    if (!open) return

    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setOpen(false)
    }

    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [busy, open])

  const reset = () => {
    setOpen(false)
    setStep(1)
    setBusy(false)
    setTitle("新建策略会话")
    setReqs(["请描述你的策略需求"])
  }

  const submit = async () => {
    if (step === 1) {
      setBusy(true)
      await sleep(500)
      setBusy(false)
      setStep(2)
      return
    }

    if (step === 2) {
      setStep(3)
      return
    }

    if (!path) return
    socket.emit("session.create", { workspacePath: path, title })
    props?.onCreate?.()
    reset()
  }

  const rename = (id: string) => {
    const session = state.sessions.find((item) => item.id === id)
    if (!session) return
    const title = window.prompt("新名称", session.title)?.trim()
    if (!title) return

    socket.emit("session.update", { id, title })
  }

  const remove = (id: string) => {
    if (state.sessions.length === 1) return
    if (!window.confirm("确定删除这个策略会话吗？")) return

    socket.emit("session.delete", { id })
  }

  return {
    sessions: state.sessions,
    active: state.active,
    open,
    setOpen,
    step,
    setStep,
    busy,
    title,
    setTitle,
    reqs,
    setReqs,
    setActive: (id: string) => dispatch(setActive(id)),
    rename,
    remove,
    submit,
  }
}
