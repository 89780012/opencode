import { memo } from "react"
import { PauseCircle } from "lucide-react"
import type { NodeProps } from "@xyflow/react"
import type { WorkflowFlowNode } from "@/types/workflow"
import { WorkflowNodeFrame } from "./workflow-node-shared"

function GateView(props: NodeProps<WorkflowFlowNode>) {
  return (
    <WorkflowNodeFrame
      props={props}
      icon={PauseCircle}
      badge="人工"
      top={
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-3">
          <div className="text-[11px] font-medium text-slate-700">人工确认</div>
          <div className="mt-1 text-[12px] leading-5 text-slate-700">
            用于暂停流程，等待外部确认、权限处理，或人工决策后继续。
          </div>
        </div>
      }
    />
  )
}

export const WorkflowGateNode = memo(GateView)
