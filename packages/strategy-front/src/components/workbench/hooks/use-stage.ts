import { useState } from "react"
import { workbenchApi } from "@/api/modules"
import { useAppDispatch } from "@/store"
import { setFlowchart, setStage } from "@/store/workbench-slice"
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

  const save = async (code: string) => {
    const flow = app.flow
    if (!flow?.workspacePath) return
    const data = await workbenchApi.saveFlowchart({
      workspacePath: flow.workspacePath,
      worktreePath: flow.worktreePath || flow.workspacePath,
      code,
      manual: true,
      source: "manual",
    })
    dispatch(
      setFlowchart({
        workspacePath: data.workspacePath,
        flowchart: {
          workspacePath: data.workspacePath,
          worktreePath: data.worktreePath,
          state: data.state,
          code: data.code,
          err: data.err ?? "",
          manual: data.manual,
          source: data.source,
          updatedAt: data.updatedAt,
        },
      }),
    )
  }

  return {
    active: app.active,
    cur: app.cur,
    flowchart: app.flow,
    file,
    tab,
    setTab,
    stage: app.stage,
    diff,
    saveFlowchart: save,
    backtest: app.backtest,
  }
}
