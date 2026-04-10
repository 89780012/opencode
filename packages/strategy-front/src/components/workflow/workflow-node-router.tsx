import { memo } from "react"
import { Search } from "lucide-react"
import type { NodeProps } from "@xyflow/react"
import type { WorkflowFlowNode } from "@/types/workflow"
import { WorkflowNodeFrame } from "./workflow-node-shared"

function RouterView(props: NodeProps<WorkflowFlowNode>) {
  return (
    <WorkflowNodeFrame
      props={props}
      icon={Search}
      badge="路由"
      top={
        <div className="rounded-xl border border-sky-200 bg-sky-50/85 px-3 py-3">
          <div className="flex items-center gap-2 text-[11px] font-medium text-sky-700">
            <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5">plan</span>
            <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5">execute</span>
            <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5">check</span>
          </div>
          <div className="mt-2 text-[12px] leading-5 text-sky-950/75">根据当前请求和上游结果，选择下一步进入规划、执行还是检查。</div>
        </div>
      }
    />
  )
}

export const WorkflowRouterNode = memo(RouterView)
