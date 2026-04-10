import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  MarkerType,
  MiniMap,
  ReactFlow,
  reconnectEdge,
  type Connection,
  type Edge,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import { Boxes, Trash2 } from "lucide-react"
import "@xyflow/react/dist/style.css"
import { WorkflowMiniToolbar } from "@/components/workflow/workflow-mini-toolbar"
import { workflowNodeTypes } from "@/components/workflow/workflow-node"
import { makeNode } from "@/types/workflow"
import type { WorkflowDetail, WorkflowFlowEdge, WorkflowFlowNode, WorkflowKind, WorkflowSeed } from "@/types/workflow"

const grid: [number, number] = [24, 24]

const tone = (active = false) => ({
  stroke: active ? "#2563eb" : "#1d84ff",
  strokeWidth: active ? 3 : 2.2,
  filter: active ? "drop-shadow(0 0 7px rgba(37,99,235,0.24))" : "drop-shadow(0 0 4px rgba(29,132,255,0.1))",
})

function edgeStyle(edge: WorkflowFlowEdge, active = false) {
  return {
    ...edge,
    type: "smoothstep" as const,
    animated: false,
    selected: active,
    style: tone(active),
    interactionWidth: 32,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: active ? "#2563eb" : "#1d84ff",
    },
    labelStyle: {
      fill: "#0f172a",
      fontSize: 11,
      fontWeight: 600,
    },
    labelBgStyle: {
      fill: "rgba(255,255,255,0.94)",
      fillOpacity: 1,
      stroke: active ? "rgba(37,99,235,0.32)" : "rgba(148,163,184,0.3)",
      strokeWidth: 1,
    },
    labelBgPadding: [7, 3] as [number, number],
    labelBgBorderRadius: 999,
  } satisfies WorkflowFlowEdge
}

function label(edge: WorkflowFlowEdge) {
  if (typeof edge.label === "string" && edge.label.trim()) return edge.label.trim()
  if (edge.data?.cond === "pass" || edge.data?.cond === "fail") return edge.data.cond
  return undefined
}

function decorate(edge: WorkflowFlowEdge, active = false) {
  return edgeStyle(
    {
      ...edge,
      label: label(edge),
    },
    active,
  )
}

export function WorkflowCanvas(props: {
  item: WorkflowDetail
  onPick: (node: WorkflowFlowNode | null) => void
  onEdgePick?: (edge: WorkflowFlowEdge | null) => void
  onChange?: (nodes: WorkflowFlowNode[], edges: WorkflowFlowEdge[]) => void
}) {
  const seq = useRef(0)
  const sync = useRef(false)
  const [rf, setRf] = useState<ReactFlowInstance<WorkflowFlowNode, WorkflowFlowEdge> | null>(null)
  const [nodes, setNodes, onNodes] = useNodesState(props.item.nodes)
  const [edges, setEdges, onEdges] = useEdgesState(props.item.edges)
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)

  const drop = (kind: WorkflowKind, x: number, y: number, seed?: WorkflowSeed) => {
    if (!rf) return
    const pos = rf.screenToFlowPosition({ x, y })
    const id = `${kind}-${Date.now()}-${seq.current++}`
    const next = makeNode(
      kind,
      id,
      {
        x: pos.x - 110 + seq.current * 8,
        y: pos.y - 60 + seq.current * 8,
      },
      seed,
    )
    setNodes((prev) => [...prev, next])
  }

  useEffect(() => {
    sync.current = true
    setNodes((prev) =>
      props.item.nodes.map((item) => ({
        ...item,
        selected: prev.some((row) => row.id === item.id && row.selected),
      })),
    )
    setEdges((prev) =>
      props.item.edges.map((item) => {
        const active = prev.some((row) => row.id === item.id && row.selected)
        return decorate(item, active)
      }),
    )
  }, [props.item, setEdges, setNodes])

  useEffect(() => {
    if (!menu) return
    if (props.item.edges.some((item) => item.id === menu.id)) return
    setMenu(null)
  }, [menu, props.item.edges])

  useEffect(() => {
    if (sync.current) {
      sync.current = false
      return
    }
    props.onChange?.(nodes, edges)
  }, [edges, nodes, props.onChange])

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

  const map = useMemo(
    () =>
      ({
        maskColor: "rgba(255,255,255,0.12)",
        nodeStrokeColor: "#d9d9de",
        nodeColor: "#dddddf",
        nodeBorderRadius: 2,
      }) satisfies React.ComponentProps<typeof MiniMap>,
    [],
  )

  return (
    <div className="relative h-full min-h-0 flex-1 bg-[#ffffff] dark:bg-[#0f1114]">
      <ReactFlow<WorkflowFlowNode, WorkflowFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={workflowNodeTypes}
        fitView
        snapToGrid
        snapGrid={grid}
        fitViewOptions={{ maxZoom: 0.8, padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{
          stroke: "#2563eb",
          strokeWidth: 2.2,
          strokeDasharray: "6 6",
        }}
        connectionRadius={26}
        selectNodesOnDrag={false}
        elevateEdgesOnSelect
        edgesReconnectable
        defaultEdgeOptions={{
          type: "smoothstep",
          style: tone(),
          interactionWidth: 32,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: "#1d84ff",
          },
          labelStyle: {
            fill: "#0f172a",
            fontSize: 11,
            fontWeight: 600,
          },
          labelBgStyle: {
            fill: "rgba(255,255,255,0.94)",
            fillOpacity: 1,
            stroke: "rgba(148,163,184,0.3)",
            strokeWidth: 1,
          },
          labelBgPadding: [7, 3],
          labelBgBorderRadius: 999,
        }}
        onInit={setRf}
        onNodesChange={onNodes}
        onEdgesChange={onEdges}
        onConnect={(conn: Connection) =>
          setEdges((prev) =>
            addEdge(
              {
                ...conn,
                animated: false,
                label: undefined,
                data: { cond: "always" },
              },
              prev,
            ).map((item) => decorate(item))
          )
        }
        onReconnect={(old, conn) =>
          setEdges((prev) =>
            reconnectEdge(old, conn, prev, {
              shouldReplaceId: false,
            }).map((item) => decorate(item, item.id === old.id && !!old.selected)),
          )
        }
        onPaneClick={() => {
          props.onPick(null)
          props.onEdgePick?.(null)
          setMenu(null)
          setEdges((prev) => prev.map((item) => decorate(item)))
        }}
        onNodeClick={(_, node) => {
          props.onPick(node as WorkflowFlowNode)
          props.onEdgePick?.(null)
          setEdges((prev) => prev.map((item) => decorate(item)))
        }}
        onSelectionChange={({ nodes }) => props.onPick((nodes[0] as WorkflowFlowNode | undefined) ?? null)}
        onEdgeClick={(event, hit: Edge) => {
          event.stopPropagation()
          props.onPick(null)
          props.onEdgePick?.(hit as WorkflowFlowEdge)
          setMenu(null)
          setEdges((prev) => prev.map((item) => decorate(item, item.id === hit.id)))
        }}
        onEdgeContextMenu={(event, hit: Edge) => {
          event.preventDefault()
          event.stopPropagation()
          props.onPick(null)
          props.onEdgePick?.(hit as WorkflowFlowEdge)
          setEdges((prev) => prev.map((item) => decorate(item, item.id === hit.id)))
          setMenu({
            id: hit.id,
            x: event.clientX,
            y: event.clientY,
          })
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = "copy"
        }}
        onDrop={(event) => {
          event.preventDefault()
          const raw = event.dataTransfer.getData("application/opencode-workflow-node")
          if (raw) {
            try {
              const item = JSON.parse(raw) as WorkflowSeed & { kind?: WorkflowKind }
              if (item.kind) {
                drop(item.kind, event.clientX, event.clientY, item)
                return
              }
            } catch {}
          }
          const kind = event.dataTransfer.getData("application/opencode-workflow") as WorkflowKind
          if (!kind) return
          drop(kind, event.clientX, event.clientY)
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.55} color="rgba(51, 65, 85, 0.44)" />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          className="!mb-4 !mr-4 !overflow-hidden !rounded-none !border !border-[#6f8cff] !bg-white shadow-[0_10px_26px_-18px_rgba(59,130,246,0.28)]"
          style={{
            width: 176,
            height: 92,
            background: "#ffffff",
            border: "1.5px solid #6f8cff",
            borderRadius: 0,
          }}
          {...map}
        />
      </ReactFlow>

      {nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-sm rounded-3xl border border-dashed border-border/70 bg-background/92 px-6 py-5 text-center shadow-sm backdrop-blur">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Boxes className="size-5" />
            </div>
            <div className="mt-3 text-base font-semibold text-foreground">这个工作流还没有节点</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
              从左侧节点库拖入第一个节点开始搭建。你可以先放一个开始节点，再接执行、检查或判断节点。
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-5 right-[220px] z-20 rounded-full border border-border/70 bg-white/92 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur dark:bg-[#111417]/92">
        拖拽蓝点即可连线，选中连线后可直接拖动端点重连。
      </div>

      <WorkflowMiniToolbar />

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
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-normal text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                onClick={() => {
                  setEdges((prev) => prev.filter((edge) => edge.id !== menu.id))
                  props.onEdgePick?.(null)
                  setMenu(null)
                }}
              >
                <Trash2 className="size-4" />
                <span>删除连线</span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
