import { ChartColumn, Clock3, Code, MessageSquareMore, Workflow } from "lucide-react"
import type { Stage } from "../data"
import shell from "../styles/layout/shell.module.css"

const tabs = [
  { key: "session", icon: MessageSquareMore, label: "会话与审查" },
  { key: "flowchart", icon: Workflow, label: "流程图" },
  { key: "code", icon: Code, label: "代码" },
  { key: "backtest", icon: ChartColumn, label: "回测" },
  { key: "timeline", icon: Clock3, label: "时间线" },
] as const

export function Topbar(props: { stage: Stage; name: string; onStage: (stage: Stage) => void }) {
  return (
    <div className={shell.topbar} style={{ fontSize: 12 }}>
      <div className={shell.toptabs}>
        {tabs.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              className={`${shell.topbtn} ${props.stage === item.key ? shell.topactive : ""}`}
              onClick={() => props.onStage(item.key)}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
      <div className={shell.current}>当前会话：{props.name}</div>
    </div>
  )
}
