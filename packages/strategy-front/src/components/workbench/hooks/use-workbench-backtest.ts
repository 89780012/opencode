import { useEffect } from "react"
import { backtestApi } from "@/api/modules"
import { selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import { setBacktests, upsertBacktest } from "@/store/workbench-slice"

export function useWorkbenchBacktestSync() {
  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)

  useEffect(() => {
    let live = true
    if (!state.sessionPath || !state.active) return
    void backtestApi.runs(state.sessionPath, state.active).then((data) => {
      if (!live) return
      dispatch(setBacktests({ workspacePath: state.sessionPath, sessionId: state.active, runs: data.runs }))
    }).catch(() => undefined)
    return () => {
      live = false
    }
  }, [dispatch, state.active, state.sessionPath])

  useEffect(() => {
    if (!state.sessionPath || !state.active) return
    const run = state.backtests.find((item) => item.status === "pending" || item.status === "running")
    if (!run) return
    const timer = window.setInterval(() => {
      void backtestApi.refresh(run.id).then((data) => {
        dispatch(upsertBacktest({ workspacePath: state.sessionPath, run: data }))
      }).catch(() => undefined)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [dispatch, state.active, state.backtests, state.sessionPath])
}
