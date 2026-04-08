import { type ReactNode, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Copy, Trash2, type LucideIcon } from "lucide-react"
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react"
import { Input } from "@/components/ui/input"
import { useSkillList } from "@/data/global-data-provider"
import { cn } from "@/lib/utils"
import {
  workflowField,
  type WorkflowField,
  type WorkflowFlowEdge,
  type WorkflowFlowNode,
  type WorkflowNodeType,
} from "@/types/workflow"

const label = "text-[12px] leading-none text-foreground/72"

export const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

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

function list(item: WorkflowField, names: string[]) {
  if (item.kind !== "multi" || item.key !== workflowField.skills) {
    return "options" in item ? (item.options ?? []) : []
  }
  return names
}

function toggle(list: string[], value: string, checked: boolean) {
  if (checked) {
    return list.includes(value) ? list : [...list, value]
  }
  return list.filter((item) => item !== value)
}

function SkillField(props: {
  item: Extract<WorkflowField, { kind: "multi" }>
  names: string[]
  save: (next: WorkflowField) => void
}) {
  const [q, setQ] = useState("")
  const opts = list(props.item, props.names).filter((opt) => {
    const value = typeof opt === "string" ? opt : opt.value
    const text = typeof opt === "string" ? opt : opt.label
    const key = q.trim().toLowerCase()
    if (!key) return true
    return value.toLowerCase().includes(key) || text.toLowerCase().includes(key)
  })

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className={label}>{props.item.label}</div>
        <div className="text-[11px] text-muted-foreground">已选 {props.item.value.length} 项</div>
      </div>
      <Input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="搜索技能"
        className="nodrag nopan h-8 border-border/70 text-[12px] shadow-none"
        onWheelCapture={(event) => event.stopPropagation()}
        onPointerDownCapture={stop}
        onClick={stop}
      />
      <div
        className="nodrag nopan rounded-md border border-dashed border-border/70 bg-muted/25 px-1.5 py-1"
        onWheelCapture={(event) => event.stopPropagation()}
        onPointerDownCapture={stop}
      >
        <div className="flex flex-wrap content-start gap-1.5">
          {props.item.value.length > 0 ? (
            props.item.value.map((row) => (
              <span
                key={row}
                className="inline-flex max-w-full items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"
                title={row}
              >
                <span className="max-w-[240px] truncate">{row}</span>
              </span>
            ))
          ) : (
            <span className="px-1 text-[11px] text-muted-foreground">还没有选择技能</span>
          )}
        </div>
      </div>
      <div
        className="h-[132px] space-y-1 overflow-y-auto overscroll-contain rounded-md border border-border/70 bg-background p-2"
        onWheelCapture={(event) => event.stopPropagation()}
        onPointerDownCapture={stop}
      >
        {opts.length > 0 ? (
          opts.map((opt) => {
            const value = typeof opt === "string" ? opt : opt.value
            const text = typeof opt === "string" ? opt : opt.label
            return (
              <label
                key={value}
                className="nodrag nopan flex items-center gap-2 rounded-md px-1 py-1 text-[13px] text-foreground hover:bg-muted/40"
                onPointerDownCapture={stop}
                onClick={stop}
              >
                <input
                  type="checkbox"
                  checked={props.item.value.includes(value)}
                  onChange={(event) =>
                    props.save({
                      ...props.item,
                      value: toggle(props.item.value, value, event.target.checked),
                    })
                  }
                  onPointerDownCapture={stop}
                  onClick={stop}
                  className="nodrag nopan size-4 shrink-0 rounded border-border/80"
                />
                <span className="min-w-0 flex-1 truncate">{text}</span>
              </label>
            )
          })
        ) : (
          <div className="px-1 py-2 text-[12px] text-muted-foreground">没有匹配的技能</div>
        )}
      </div>
    </div>
  )
}

function field(item: WorkflowField, i: number, names: string[], save: (i: number, next: WorkflowField) => void) {
  if (item.kind === "text") {
    return (
      <div key={i} className="space-y-1.5">
        <div className={label}>{item.label}</div>
        <Input
          value={item.value}
          onChange={(event) => save(i, { ...item, value: event.target.value })}
          onPointerDownCapture={stop}
          onClick={stop}
          className="nodrag nopan h-9 border-border/70 text-[13px] shadow-none"
        />
      </div>
    )
  }

  if (item.kind === "select") {
    return (
      <div key={i} className="space-y-1.5">
        <div className={label}>{item.label}</div>
        <select
          value={item.value}
          onChange={(event) => save(i, { ...item, value: event.target.value })}
          onPointerDownCapture={stop}
          className="nodrag nopan h-9 w-full rounded-md border border-border/70 bg-background px-3 text-[13px] font-normal text-foreground outline-none focus:border-primary/40"
        >
          {(item.options ?? [item.value]).map((opt) => (
            <option key={typeof opt === "string" ? opt : opt.value} value={typeof opt === "string" ? opt : opt.value}>
              {typeof opt === "string" ? opt : opt.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (item.kind === "range") {
    return (
      <div key={i} className="space-y-1.5">
        <div className={label}>{item.label}</div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={item.from}
            onChange={(event) => save(i, { ...item, from: event.target.value })}
            onPointerDownCapture={stop}
            className="nodrag nopan h-9 rounded-md border border-border/70 bg-background px-3 text-[13px] font-normal text-foreground outline-none focus:border-primary/40"
          />
          <input
            value={item.to}
            onChange={(event) => save(i, { ...item, to: event.target.value })}
            onPointerDownCapture={stop}
            className="nodrag nopan h-9 rounded-md border border-border/70 bg-background px-3 text-[13px] font-normal text-foreground outline-none focus:border-primary/40"
          />
        </div>
      </div>
    )
  }

  if (item.kind === "multi") {
    return <SkillField key={i} item={item} names={names} save={(next) => save(i, next)} />
  }

  if (item.kind === "checks") {
    return (
      <div key={i} className="space-y-1.5">
        <div className={label}>{item.label}</div>
        <div className="space-y-1 rounded-md border border-border/70 bg-background p-2" onPointerDownCapture={stop}>
          {item.items.map((row, j) => (
            <label
              key={row.label}
              className="nodrag nopan flex cursor-pointer items-center gap-2 text-[13px] font-normal text-foreground"
              onPointerDownCapture={stop}
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
                className="nodrag nopan size-4 rounded border-border/80"
              />
              <span>{row.label}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div key={i} className="space-y-1.5">
      <div className={label}>{item.label}</div>
      <textarea
        value={item.value}
        onChange={(event) => save(i, { ...item, value: event.target.value })}
        onPointerDownCapture={stop}
        className="nodrag nopan min-h-[96px] w-full resize-none rounded-md border border-border/70 bg-background px-3 py-2 text-[13px] font-normal text-foreground outline-none focus:border-primary/40"
      />
    </div>
  )
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
  const skills = useSkillList()
  const data = input.props.data
  const hasFields = data.fields.length > 0
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

  const save = (i: number, next: WorkflowField) => {
    rf.updateNodeData(input.props.id, (node) => ({
      fields: node.data.fields.map((item, idx) => (idx === i ? next : item)),
    }))
  }

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
        </div>
      </div>

      {input.top ? <div className="pt-3">{input.top}</div> : null}
      {hasFields ? <div className="space-y-3 pt-3">{data.fields.map((item, i) => field(item, i, skills.names, save))}</div> : null}
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
