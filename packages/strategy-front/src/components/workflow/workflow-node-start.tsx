import { memo } from "react"
import { Play } from "lucide-react"
import type { NodeProps } from "@xyflow/react"
import type { WorkflowFlowNode } from "@/types/workflow"
import { WorkflowNodeFrame } from "./workflow-node-shared"

function StartView(props: NodeProps<WorkflowFlowNode>) {
  return (
    <WorkflowNodeFrame
      props={props}
      icon={Play}
      badge="入口"
      left={false}
      top={
        <div className="rounded-xl border border-primary/15 bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(255,255,255,0.96))] px-3 py-3">
          <div className="text-[11px] font-medium text-primary/90">流程入口</div>
          <div className="mt-1 text-[12px] leading-5 text-muted-foreground">接收目标、整理上下文，并把流程送入第一步。</div>
        </div>
      }
    />
  )
}

export const WorkflowStartNode = memo(StartView)
