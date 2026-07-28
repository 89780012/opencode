import { useEffect } from "react"
import { workbenchApi, type Workflow } from "@/api/modules/workbench"
import { socket, type SocketEvent } from "@/lib/socket-bus"
import { selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import { setWorkflow, upsertWorkflow } from "@/store/workbench-slice"

function obj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
}

export function parse(value: unknown): Workflow | null {
  if (!obj(value)) return null
  if (typeof value.id !== "string" || typeof value.workspacePath !== "string" || typeof value.sessionId !== "string")
    return null
  if (typeof value.revision !== "number" || typeof value.updatedAt !== "number") return null
  if (!["review", "debug", "backtest", "done"].includes(String(value.stage))) return null
  if (!["requested", "dispatching", "running", "fixing", "passed", "failed", "review_exhausted", "cancelled", "paused"].includes(String(value.state)))
    return null
  return value as Workflow
}

export function useWorkbenchWorkflowSync() {
  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)
  const path = state.sessionPath
  const session = state.active

  useEffect(() => {
    let live = true
    dispatch(setWorkflow({ workspacePath: path, sessionId: session, workflow: null }))
    if (!path || !session) return
    const load = () => {
      void workbenchApi.workflow(path, session).then((workflow) => {
        if (!live) return
        dispatch(setWorkflow({ workspacePath: path, sessionId: session, workflow: parse(workflow) }))
      }).catch(() => undefined)
    }
    load()
    const off = socket.on("socket.open", load)
    return () => {
      live = false
      off()
    }
  }, [dispatch, path, session])

  useEffect(() => {
    const update = (event: SocketEvent) => {
      const row = parse(event.payload)
      if (!row || row.workspacePath !== path || row.sessionId !== session) return
      dispatch(upsertWorkflow(row))
    }
    return socket.on("workflow.updated", update)
  }, [dispatch, path, session])
}
