import { memo } from "react"
import { Search } from "lucide-react"
import type { NodeProps } from "@xyflow/react"
import type { WorkflowFlowNode } from "@/types/workflow"
import { WorkflowNodeFrame } from "./workflow-node-shared"

function IntentView(props: NodeProps<WorkflowFlowNode>) {
  return (
    <WorkflowNodeFrame
      props={props}
      icon={Search}
      badge="意图路由"
      top={
        <div className="rounded-xl border border-sky-200 bg-sky-50/85 px-3 py-3">
          <div className="flex items-center gap-2 text-[11px] font-medium text-sky-700">
            <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5">plan</span>
            <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5">build</span>
            <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5">checker</span>
          </div>
          <div className="mt-2 text-[12px] leading-5 text-sky-950/75">
            根据当前消息判断下一步流向规划、执行还是检查，并返回结构化路由结果。
          </div>
        </div>
      }
    />
  )
}

export const WorkflowIntentNode = memo(IntentView)
