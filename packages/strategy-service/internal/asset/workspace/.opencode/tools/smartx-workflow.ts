import { tool } from "@opencode-ai/plugin"

export default tool({
  description:
    "提交结构化的 SmartX 工作流输出。当工作流节点要求调用工具时，请使用此工具，而不是在助手文本中直接粘贴原始 JSON。",
  args: {
    kind: tool.schema
      .enum(["intent", "plan", "build", "judge", "review", "gate"])
      .describe("产出该结果的工作流节点类型。"),
    summary: tool.schema.string().min(1).describe("该节点结果的简要摘要。"),
    next_prompt: tool.schema.string().optional().describe("传递给下一个工作流节点的可选交接提示词。"),
    intent: tool.schema.enum(["plan", "build", "checker"]).optional().describe("当 kind 为 intent 时必填。"),
    pass: tool.schema.boolean().optional().describe("当 kind 为 judge 或 review 时必填。"),
    issues: tool.schema.array(tool.schema.string()).optional().describe("judge 或 review 发现的关键问题。"),
    plan: tool.schema.array(tool.schema.string()).optional().describe("规划节点的有序实施步骤。"),
    deliverables: tool.schema.array(tool.schema.string()).optional().describe("该计划预期产出的交付物。"),
    risks: tool.schema.array(tool.schema.string()).optional().describe("重要风险或约束条件。"),
  },
  async execute(args, ctx) {
    const title =
      args.kind === "intent"
        ? "SmartX 意图"
        : args.kind === "plan"
          ? "SmartX 计划"
          : args.kind === "build"
            ? "SmartX 构建"
            : args.kind === "judge"
              ? "SmartX 评判"
              : args.kind === "review"
                ? "SmartX 评审"
                : "SmartX 门禁"

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
