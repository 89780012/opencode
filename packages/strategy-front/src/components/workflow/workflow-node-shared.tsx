import { type ReactNode, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Copy, Trash2, type LucideIcon } from "lucide-react"
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react"
import { cn } from "@/lib/utils"
import type { WorkflowFlowEdge, WorkflowFlowNode, WorkflowNodeType } from "@/types/workflow"

function tone(value: WorkflowFlowNode["data"]["tone"]) {
  if (value === "amber") {
    return {
      shell:
        "border-[#ddb86b] shadow-[0_0_0_1px_rgba(221,184,107,0.7),0_0_0_2px_hsl(var(--primary)/0.12),0_14px_30px_-22px_rgba(245,158,11,0.24)]",
      icon: "text-amber-500",
    }
  }

  if (value === "blue") {
    return {
      shell:
        "border-[#9fbaff] shadow-[0_0_0_1px_rgba(159,186,255,0.82),0_0_0_2px_hsl(var(--primary)/0.14),0_14px_30px_-22px_rgba(59,130,246,0.22)]",
      icon: "text-primary",
    }
  }

  return {
    shell:
      "border-[#bcc9d8] shadow-[0_0_0_1px_rgba(188,201,216,0.86),0_0_0_2px_hsl(var(--primary)/0.1),0_14px_30px_-22px_rgba(148,163,184,0.2)]",
    icon: "text-slate-500",
  }
}

type FrameProps = {
  props: NodeProps<WorkflowFlowNode>
  icon: LucideIcon
  top?: ReactNode
  foot?: ReactNode
  left?: boolean
  right?: boolean
  badge?: string
}

export function WorkflowNodeFrame(input: FrameProps) {
  const rf = useReactFlow<WorkflowFlowNode, WorkflowFlowEdge>()
  const data = input.props.data
  const ui = tone(data.tone)
  const Icon = input.icon
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!menu) return

    const close = () => setMenu(null)
    window.addEventListener("pointerdown", close)
    window.addEventListener("blur", close)

    return () => {
      window.removeEventListener("pointerdown", close)
      window.removeEventListener("blur", close)
    }
  }, [menu])

  const copy = () => {
    const node = rf.getNode(input.props.id)
    const id = `${input.props.id}-copy-${Date.now()}`
    rf.addNodes({
      id,
      type: ((node?.type as WorkflowNodeType | undefined) || input.props.type || "workflow-plan") as WorkflowNodeType,
      dragHandle: ".workflow-drag",
      position: {
        x: (node?.position.x ?? 0) + 36,
        y: (node?.position.y ?? 0) + 36,
      },
      data: structuredClone(data),
      selected: false,
    })
    setMenu(null)
  }

  const remove = () => {
    void rf.deleteElements({ nodes: [{ id: input.props.id }] })
    setMenu(null)
  }

  return (
    <div
      className={cn(
        "workflow-drag relative w-[320px] min-w-[320px] max-w-[320px] cursor-grab rounded-md border bg-white px-3.5 py-3 transition-all active:cursor-grabbing dark:bg-[#101418]",
        ui.shell,
        input.props.selected
          ? "border-primary shadow-[0_0_0_1px_rgba(79,127,247,0.65),0_0_0_4px_rgba(79,127,247,0.14),0_18px_36px_-24px_rgba(59,130,246,0.32)]"
          : "",
      )}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setMenu({
          x: event.clientX,
          y: event.clientY,
        })
      }}
    >
      {input.left !== false ? (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-[18px] !w-[18px] !border-[3px] !border-white !bg-[var(--primary)] !opacity-100 shadow-[0_0_0_1px_rgba(79,127,247,0.16),0_6px_16px_rgba(59,130,246,0.2)]"
        />
      ) : null}
      {input.right !== false ? (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-[18px] !w-[18px] !border-[3px] !border-white !bg-[var(--primary)] !opacity-100 shadow-[0_0_0_1px_rgba(79,127,247,0.16),0_6px_16px_rgba(59,130,246,0.2)]"
        />
      ) : null}

      <div className="workflow-drag flex cursor-grab items-center gap-2.5 border-b border-[#d8e2f0] pb-3 active:cursor-grabbing">
        <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center", ui.icon)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          {input.badge ? (
            <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {input.badge}
            </div>
          ) : null}
          <div className="truncate text-[16px] font-medium text-foreground">{data.title}</div>
          {data.desc ? <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground">{data.desc}</div> : null}
        </div>
      </div>

      {input.top ? <div className="pt-3">{input.top}</div> : null}
      {input.foot ? <div className="pt-3">{input.foot}</div> : null}

      {menu && typeof document !== "undefined"
        ? createPortal(
            <div
              className="nodrag nopan fixed z-[1000] min-w-[148px] overflow-hidden rounded-xl border border-border/70 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.14)] dark:bg-[#111417]"
              style={{
                left: menu.x + 8,
                top: menu.y + 8,
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-normal text-foreground transition-colors hover:bg-muted/60"
                onClick={copy}
              >
                <Copy className="size-4 text-muted-foreground" />
                <span>复制节点</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t border-border/70 px-3 py-2.5 text-left text-sm font-normal text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                onClick={remove}
              >
                <Trash2 className="size-4" />
                <span>删除节点</span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
