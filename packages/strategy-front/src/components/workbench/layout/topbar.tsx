import { ChartColumn, Clock3, Code, MessageSquareMore, Workflow } from "lucide-react"
import { useAppDispatch } from "@/store"
import { setStage } from "@/store/workbench-slice"
import { useWorkbench } from "../hooks/use-workbench"
import shell from "../styles/layout/shell.module.css"

const tabs = [
  { key: "session", icon: MessageSquareMore, label: "会话与审查" },
  { key: "flowchart", icon: Workflow, label: "流程图" },
  { key: "code", icon: Code, label: "代码" },
  { key: "backtest", icon: ChartColumn, label: "回测" },
  { key: "timeline", icon: Clock3, label: "时间线" },
] as const

export function Topbar() {
  const app = useWorkbench()
  const dispatch = useAppDispatch()

  return (
    <div className={shell.topbar} style={{ fontSize: 12 }}>
      <div className={shell.toptabs}>
        {tabs.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              className={`${shell.topbtn} ${app.stage === item.key ? shell.topactive : ""}`}
              onClick={() => dispatch(setStage(item.key))}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
      <div className={shell.current}>当前会话：{app.cur.name}</div>
    </div>
  )
}
