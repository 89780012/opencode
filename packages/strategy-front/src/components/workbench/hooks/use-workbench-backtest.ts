import { useEffect, useMemo, useRef, useState } from "react"
import { backtestApi } from "@/api/modules"
import { isBacktestRun, isBacktestUpdate } from "@/lib/backtest"
import { results } from "@/lib/backtest-tool"
import { socket } from "@/lib/socket-bus"
import { selectSessionMessages, selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import { setBacktestScope, setBacktests, updateBacktest, upsertBacktest } from "@/store/workbench-slice"
import type { ChatToolPart } from "@/types/chat"

function same(a: ChatToolPart[], b: ChatToolPart[]) {
  return a.length === b.length && a.every((part, idx) => part === b[idx])
}

export function useWorkbenchBacktestSync() {
  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)
  const tools = useAppSelector(
    (root) =>
      selectSessionMessages(root, root.workbench.active).slice(-8).flatMap((message) =>
        (root.chatSession.parts[message.id] ?? []).filter(
          (part): part is ChatToolPart =>
            part.type === "tool" && part.tool === "smartx_run_backtest" && part.state.status === "completed",
        ),
      ),
    same,
  )
  const known = useRef(new Set<string>())
  const seen = useRef(new Set<string>())
  const loaded = useRef("")
  const [stamp, setStamp] = useState(0)
  const runs = useMemo(() => results(tools), [tools])

  useEffect(() => {
    loaded.current = ""
    const path = state.sessionPath
    const session = state.active
    dispatch(setBacktestScope({ workspacePath: path, sessionId: session }))
    if (!path || !session) return
    const scope = `${path}\x00${session}`

    let live = true
    let seq = 0
    const ids = known.current
    ids.clear()
    const load = () => {
      const id = ++seq
      const done = () => {
        if (!live || id !== seq) return
        loaded.current = scope
        setStamp((value) => value + 1)
      }
      void backtestApi
        .runs(path, session)
        .then((data) => {
          if (!live || id !== seq) return
          const runs = data.runs.filter((run) => run.workspacePath === path && run.sessionId === session)
          runs.forEach((run) => ids.add(run.id))
          dispatch(setBacktests({ workspacePath: path, sessionId: session, runs }))
          done()
        }, done)
    }
    const detail = (id: string) => {
      void backtestApi
        .detail(id, path, session)
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

  useEffect(() => {
    const path = state.sessionPath
    const session = state.active
    const scope = `${path}\x00${session}`
    if (
      !path ||
      !session ||
      loaded.current !== scope ||
      state.backtestPath !== path ||
      state.backtestSession !== session
    ) return

    runs.forEach((item) => {
      const run = item.data.run
      if (
        run.workspacePath !== path ||
        run.sessionId !== session ||
        known.current.has(run.id) ||
        state.backtests.some((entry) => entry.id === run.id) ||
        seen.current.has(item.key)
      ) return
      seen.current.add(item.key)

      const list = () => {
        void backtestApi
          .runs(path, session)
          .then((data) => {
            const rows = data.runs.filter(isBacktestRun).filter(
              (entry) => entry.workspacePath === path && entry.sessionId === session,
            )
            rows.forEach((entry) => known.current.add(entry.id))
            dispatch(setBacktests({ workspacePath: path, sessionId: session, runs: rows }))
          })
          .catch(() => undefined)
      }

      void backtestApi.detail(run.id, path, session).then(
        (data) => {
          if (
            !isBacktestRun(data) ||
            data.id !== run.id ||
            data.workspacePath !== path ||
            data.sessionId !== session
          ) {
            list()
            return
          }
          known.current.add(data.id)
          dispatch(upsertBacktest({ workspacePath: path, run: data }))
        },
        list,
      )
    })
  }, [dispatch, runs, stamp, state.active, state.backtestPath, state.backtestSession, state.backtests, state.sessionPath])
}
