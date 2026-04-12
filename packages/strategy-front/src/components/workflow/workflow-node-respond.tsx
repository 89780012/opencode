import { memo } from "react"
import { MessageSquareText } from "lucide-react"
import type { NodeProps } from "@xyflow/react"
import type { WorkflowFlowNode } from "@/types/workflow"
import { WorkflowNodeFrame } from "./workflow-node-shared"

function RespondView(props: NodeProps<WorkflowFlowNode>) {
  return (
    <WorkflowNodeFrame
      props={props}
      icon={MessageSquareText}
      badge="回复"
      top={
        <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-3">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-blue-700">
            <span>直接回答</span>
            <span>chat</span>
          </div>
          <div className="mt-2 text-[12px] leading-5 text-blue-900/75">
            面向用户直接输出自然语言回复，不做代码开发；回复完成后即可流向结束节点。
          </div>
        </div>
      }
      foot={
        <div className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
          适合自我介绍、概念解释、能力说明、简单建议等无需执行的请求。
        </div>
      }
    />
  )
}

export const WorkflowRespondNode = memo(RespondView)
