import { useEffect } from "react"
import { backtestApi } from "@/api/modules"
import { isBacktestUpdate } from "@/lib/backtest"
import { socket } from "@/lib/socket-bus"
import { selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import { setBacktestScope, setBacktests, updateBacktest, upsertBacktest } from "@/store/workbench-slice"

export function useWorkbenchBacktestSync() {
  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)

  useEffect(() => {
    const path = state.sessionPath
    const session = state.active
    dispatch(setBacktestScope({ workspacePath: path, sessionId: session }))
    if (!path || !session) return

    let live = true
    let seq = 0
    const ids = new Set<string>()
    const load = () => {
      const id = ++seq
      void backtestApi
        .runs(path, session)
        .then((data) => {
          if (!live || id !== seq) return
          const runs = data.runs.filter((run) => run.workspacePath === path && run.sessionId === session)
          runs.forEach((run) => ids.add(run.id))
          dispatch(setBacktests({ workspacePath: path, sessionId: session, runs }))
        })
        .catch(() => undefined)
    }
    const detail = (id: string) => {
      void backtestApi
        .detail(id)
        .then((run) => {
          if (!live || run.workspacePath !== path || run.sessionId !== session) return
          ids.add(run.id)
          dispatch(upsertBacktest({ workspacePath: path, run }))
        })
        .catch(() => undefined)
    }
    const off = [
      socket.on("socket.open", load),
      socket.on("backtest.updated", (event) => {
        if (!isBacktestUpdate(event.payload)) return
        const update = event.payload
        if (update.workspacePath !== path || update.sessionId !== session) return
        if (!ids.has(update.id) || update.hasResult) detail(update.id)
        dispatch(updateBacktest({ workspacePath: path, update }))
      }),
    ]
    load()
    return () => {
      live = false
      seq++
      off.forEach((fn) => fn())
    }
  }, [dispatch, state.active, state.sessionPath])
}
