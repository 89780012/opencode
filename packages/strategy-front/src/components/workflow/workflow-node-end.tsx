import { memo } from "react"
import { Square } from "lucide-react"
import type { NodeProps } from "@xyflow/react"
import type { WorkflowFlowNode } from "@/types/workflow"
import { WorkflowNodeFrame } from "./workflow-node-shared"

function EndView(props: NodeProps<WorkflowFlowNode>) {
  return (
    <WorkflowNodeFrame
      props={props}
      icon={Square}
      badge="Finish"
      right={false}
      top={
        <div className="rounded-xl border border-amber-200 bg-[linear-gradient(135deg,rgba(251,191,36,0.14),rgba(255,255,255,0.96))] px-3 py-3">
          <div className="text-[11px] font-medium text-amber-800">流程终点</div>
          <div className="mt-1 text-[12px] leading-5 text-amber-950/75">汇总产出、沉淀结论，并在这里结束整条链路。</div>
        </div>
      }
    />
  )
}

export const WorkflowEndNode = memo(EndView)
