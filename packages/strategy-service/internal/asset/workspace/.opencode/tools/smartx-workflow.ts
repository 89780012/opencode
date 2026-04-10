import { tool } from "@opencode-ai/plugin"

export default tool({
  description:
    "提交结构化的工作流节点结果。当节点要求调用工具时，请使用此工具，而不是在助手文本中直接粘贴原始 JSON。",
  args: {
    kind: tool.schema
      .enum(["router", "plan", "execute", "check"])
      .describe("产出该结果的工作流节点类型。"),
    summary: tool.schema.string().min(1).describe("该节点结果的简要摘要。"),
    handoff: tool.schema.string().optional().describe("传递给下一个工作流节点的可选交接提示词。"),
    route: tool.schema.enum(["plan", "execute", "check"]).optional().describe("当 kind 为 router 时必填。"),
    pass: tool.schema.boolean().optional().describe("当 kind 为 check 时必填。"),
    issues: tool.schema.array(tool.schema.string()).optional().describe("check 发现的关键问题。"),
    steps: tool.schema.array(tool.schema.string()).optional().describe("规划节点的有序实施步骤。"),
    deliverables: tool.schema.array(tool.schema.string()).optional().describe("该计划预期产出的交付物。"),
    risks: tool.schema.array(tool.schema.string()).optional().describe("重要风险或约束条件。"),
  },
  async execute(args, ctx) {
    const title =
      args.kind === "router"
        ? "工作流路由"
        : args.kind === "plan"
          ? "工作流规划"
          : args.kind === "execute"
            ? "工作流执行"
            : "工作流检查"

    ctx.metadata({
      title,
      metadata: {
        kind: args.kind,
      },
    })

    return JSON.stringify({
      ok: true,
      kind: args.kind,
    })
  },
})
