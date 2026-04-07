import { memo, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Copy, Database, FileWarning, Trash2, WalletCards } from "lucide-react"
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react"
import { cn } from "@/lib/utils"
import type { WorkflowField, WorkflowFlowEdge, WorkflowFlowNode, WorkflowNodeData } from "@/types/workflow"

const label = "text-[12px] leading-none text-foreground/72"

function tone(value: WorkflowNodeData["tone"]) {
  if (value === "amber") {
    return {
      shell: "border-[#ddb86b] shadow-[0_0_0_1px_rgba(221,184,107,0.7),0_0_0_2px_hsl(var(--primary)/0.12),0_14px_30px_-22px_rgba(245,158,11,0.24)]",
      icon: "text-amber-500",
    }
  }

  if (value === "blue") {
    return {
      shell: "border-[#9fbaff] shadow-[0_0_0_1px_rgba(159,186,255,0.82),0_0_0_2px_hsl(var(--primary)/0.14),0_14px_30px_-22px_rgba(59,130,246,0.22)]",
      icon: "text-primary",
    }
  }

  return {
    shell: "border-[#bcc9d8] shadow-[0_0_0_1px_rgba(188,201,216,0.86),0_0_0_2px_hsl(var(--primary)/0.1),0_14px_30px_-22px_rgba(148,163,184,0.2)]",
    icon: "text-slate-500",
  }
}

function icon(kind: WorkflowNodeData["kind"]) {
  if (kind === "finance") return WalletCards
  if (kind === "source") return Database
  return FileWarning
}

function field(item: WorkflowField, i: number, save: (i: number, next: WorkflowField) => void) {
  if (item.kind === "select") {
    return (
      <div key={i} className="workflow-drag space-y-1.5">
        <div className={label}>{item.label}</div>
        <select
          value={item.value}
          onChange={(event) => save(i, { ...item, value: event.target.value })}
          className="nodrag nopan h-9 w-full rounded-md border border-border/70 bg-background px-3 text-[13px] font-normal text-foreground outline-none focus:border-primary/40"
        >
          {(item.options ?? [item.value]).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (item.kind === "range") {
    return (
      <div key={i} className="workflow-drag space-y-1.5">
        <div className={label}>{item.label}</div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={item.from}
            onChange={(event) => save(i, { ...item, from: event.target.value })}
            className="nodrag nopan h-9 rounded-md border border-border/70 bg-background px-3 text-[13px] font-normal text-foreground outline-none focus:border-primary/40"
          />
          <input
            value={item.to}
            onChange={(event) => save(i, { ...item, to: event.target.value })}
            className="nodrag nopan h-9 rounded-md border border-border/70 bg-background px-3 text-[13px] font-normal text-foreground outline-none focus:border-primary/40"
          />
        </div>
      </div>
    )
  }

  if (item.kind === "checks") {
    return (
      <div key={i} className="workflow-drag space-y-1.5">
        <div className={label}>{item.label}</div>
        <div className="workflow-drag space-y-1 rounded-md border border-border/70 bg-background p-2">
          {item.items.map((row, j) => (
            <label
              key={row.label}
              className="nodrag nopan flex cursor-pointer items-center gap-2 text-[13px] font-normal text-foreground"
            >
              <input
                type="checkbox"
                checked={!!row.checked}
                onChange={(event) =>
                  save(i, {
                    ...item,
                    items: item.items.map((entry, idx) =>
                      idx === j ? { ...entry, checked: event.target.checked } : entry,
                    ),
                  })
                }
                className="size-4 rounded border-border/80"
              />
              <span>{row.label}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div key={i} className="workflow-drag space-y-1.5">
      <div className={label}>{item.label}</div>
      <textarea
        value={item.value}
        onChange={(event) => save(i, { ...item, value: event.target.value })}
        className="nodrag nopan min-h-[96px] w-full resize-none rounded-md border border-border/70 bg-background px-3 py-2 text-[13px] font-normal text-foreground outline-none focus:border-primary/40"
      />
    </div>
  )
}

function NodeView(props: NodeProps) {
  const rf = useReactFlow<WorkflowFlowNode, WorkflowFlowEdge>()
  const data = props.data as WorkflowNodeData
  const ui = tone(data.tone)
  const Icon = icon(data.kind)
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

  const save = (i: number, next: WorkflowField) => {
    rf.updateNodeData(props.id, (node) => ({
      fields: node.data.fields.map((item, idx) => (idx === i ? next : item)),
    }))
  }

  const copy = () => {
    const node = rf.getNode(props.id)
    const id = `${props.id}-copy-${Date.now()}`
    rf.addNodes({
      id,
      type: "workflow",
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
    void rf.deleteElements({ nodes: [{ id: props.id }] })
    setMenu(null)
  }

  return (
    <div
      className={cn("relative min-w-[280px] rounded-md border bg-white px-3.5 py-3 transition-all dark:bg-[#101418]", ui.shell)}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setMenu({
          x: event.clientX,
          y: event.clientY,
        })
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-[18px] !w-[18px] !border-[3px] !border-white !bg-[var(--primary)] !opacity-100 shadow-[0_0_0_1px_rgba(79,127,247,0.16),0_6px_16px_rgba(59,130,246,0.2)]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-[18px] !w-[18px] !border-[3px] !border-white !bg-[var(--primary)] !opacity-100 shadow-[0_0_0_1px_rgba(79,127,247,0.16),0_6px_16px_rgba(59,130,246,0.2)]"
      />

      <div className="workflow-drag flex cursor-grab items-center gap-2.5 border-b border-[#d8e2f0] pb-3 active:cursor-grabbing">
        <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center", ui.icon)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[16px] font-medium text-foreground">{data.title}</div>
          {/* {data.desc ? <div className="truncate text-[11px] text-muted-foreground">{data.desc}</div> : null} */}
        </div>
      </div>

      <div className="space-y-3 pt-3">{data.fields.map((item, i) => field(item, i, save))}</div>

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

export const WorkflowNode = memo(NodeView)
