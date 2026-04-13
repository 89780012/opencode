import type { WorkflowRuntimeDetail } from "@/types/workflow"

export type WorkflowIssue = {
  id: string
  kind: "node" | "edge"
  text: string
  tip: string
}

function name(flow: WorkflowRuntimeDetail, id: string) {
  const node = flow.nodes.find((item) => item.id === id)
  return node?.title.trim() || id
}

function tool(flow: WorkflowRuntimeDetail) {
  return flow.nodes.find((node) => node.kind !== "start" && node.kind !== "end" && !node.tool_id?.trim())
}

function edge(flow: WorkflowRuntimeDetail) {
  const ids = new Set(flow.nodes.map((node) => node.id))
  return flow.edges.find((item) => !item.from || !item.to || !ids.has(item.from) || !ids.has(item.to))
}

function outs(flow: WorkflowRuntimeDetail) {
  return flow.edges.reduce(
    (map, item) => map.set(item.from, [...(map.get(item.from) || []), item]),
    new Map<string, WorkflowRuntimeDetail["edges"]>(),
  )
}

function node(flow: WorkflowRuntimeDetail, map: Map<string, WorkflowRuntimeDetail["edges"]>) {
  return flow.nodes
    .map((item) => {
      const list = map.get(item.id) || []

      if (item.kind === "start" || item.kind === "end") {
        const hit = list.find((row) => row.cond !== "always")
        if (!hit) return null
        return {
          id: hit.id,
          kind: "edge" as const,
          text: `Node "${name(flow, item.id)}" only allows always edges.`,
          tip: "Select the highlighted edge and change its condition to always.",
        }
      }

      if (item.kind === "router") {
        if (list.length === 0) {
          return {
            id: item.id,
            kind: "node" as const,
            text: `Router node "${name(flow, item.id)}" needs at least one outgoing edge.`,
            tip: "Connect it to respond, plan, execute, or check before saving.",
          }
        }
        const hit = list.find((row) => row.cond !== "respond" && row.cond !== "plan" && row.cond !== "execute" && row.cond !== "check")
        if (!hit) return null
        return {
          id: hit.id,
          kind: "edge" as const,
          text: `Router node "${name(flow, item.id)}" only allows respond, plan, execute, or check edges.`,
          tip: "Select the highlighted edge and update its condition in the right panel.",
        }
      }

      if (item.kind === "check") {
        if (list.length === 0) {
          return {
            id: item.id,
            kind: "node" as const,
            text: `Check node "${name(flow, item.id)}" needs at least one outgoing edge.`,
            tip: "Connect it to a pass or fail branch before saving.",
          }
        }
        const hit = list.find((row) => row.cond !== "pass" && row.cond !== "fail")
        if (!hit) return null
        return {
          id: hit.id,
          kind: "edge" as const,
          text: `Check node "${name(flow, item.id)}" only allows pass or fail edges.`,
          tip: "Select the highlighted edge and set its condition to pass or fail.",
        }
      }

      const hit = list.find((row) => row.cond !== "always")
      if (!hit) return null
      return {
        id: hit.id,
        kind: "edge" as const,
        text: `Node "${name(flow, item.id)}" only allows always edges.`,
        tip: "Select the highlighted edge and change its condition to always.",
      }
    })
    .find(Boolean)
}

export function audit(flow: WorkflowRuntimeDetail) {
  if (flow.nodes.length === 0) return null
  if (!flow.root_node_id || !flow.nodes.some((node) => node.id === flow.root_node_id)) {
    return {
      id: flow.nodes[0]?.id || "",
      kind: "node" as const,
      text: "Workflow root node is missing.",
      tip: "Keep a valid root node in the graph before saving.",
    }
  }

  const miss = edge(flow)
  if (miss) {
    return {
      id: miss.id,
      kind: "edge" as const,
      text: "An edge points to a missing source or target node.",
      tip: "Reconnect or remove the highlighted edge, then save again.",
    }
  }

  const missTool = tool(flow)
  if (missTool) {
    return {
      id: missTool.id,
      kind: "node" as const,
      text: `Node "${name(flow, missTool.id)}" is missing tool_id.`,
      tip: "Open the node settings in the right panel and choose a tool.",
    }
  }

  const map = outs(flow)
  const tail = flow.nodes.find((item) => item.kind === "end" && (map.get(item.id)?.length || 0) > 0)
  if (tail) {
    return {
      id: tail.id,
      kind: "node" as const,
      text: `End node "${name(flow, tail.id)}" cannot have outgoing edges.`,
      tip: "Remove its outgoing edges before saving.",
    }
  }

  return node(flow, map) || null
}
