import { useState } from "react"
import { useAppDispatch } from "@/store"
import { setStage } from "@/store/workbench-slice"
import { type CodeTab } from "../features/stage/code"
import { useWorkbench } from "./use-workbench"

export function useStage() {
  const app = useWorkbench()
  const dispatch = useAppDispatch()
  const [file, setFile] = useState<string | null>(null)
  const [tab, setTab] = useState<CodeTab>("files")

  const diff = (path: string) => {
    setFile(path)
    setTab("review")
    dispatch(setStage("code"))
  }

  return {
    active: app.active,
    cur: app.cur,
    file,
    tab,
    setTab,
    stage: app.stage,
    diff,
    send: app.send,
    backtest: app.backtest,
  }
}
