import type { Analysis, Fix, Pending } from "./types.js"

export const limit = 3

/** 告知主 agent 当前安装已关闭工作区分析与流程图。 */
export function noteDisabled() {
  return [
    "系统配置已关闭工作区分析与流程图。",
    "不要启动 `workspace-analyzer` 或 `strategy-flowchart-generator` 子 agent。",
    "不要调用 `smartx_save_analysis`、`smartx_save_flowchart` 或 `refresh_workspace`。",
    "继续执行用户请求以及 project memory、审查、回测等其他流程。",
  ].join("\n")
}

/** 生成 review 阶段的系统提示，约束主 agent 先取需求、再审查、再保存。 */
export function noteReview(input: { workspace: string; worktree: string; sessionID: string }) {
  return [
    "当前用户这一轮意图是 SmartX 策略代码审查。",
    "不要把这段系统提示复述给用户，用户侧只需要看到简短的审查进展和最终结论。",
    "",
    "必须严格按以下顺序执行：",
    `1. 先调用 strategy-service MCP 工具 \`smartx_get_requirements\`，参数至少包含 \`workspacePath: ${input.workspace}\` 与 \`sessionId: ${input.sessionID}\`。`,
    "2. 然后调用 `task` 工具启动 `strategy-reviewer` 子 agent，`subagent_type` 必须是 `strategy-reviewer`，`description` 使用 `Review strategy implementation`。",
    "3. 传给 `strategy-reviewer` 的 prompt 必须包含 requirements 结果，并要求它结合需求清单与当前代码审查实现是否满足要求。",
    "4. `strategy-reviewer` 只输出中文审查报告，不输出 JSON，不修改文件，不运行命令，也不调用其他子 agent。",
    "5. 每一轮 `strategy-reviewer` 返回后，都必须先调用 strategy-service MCP 工具 `smartx_save_review` 保存结果，然后才能修复代码或结束本轮。",
    "6. 只有 `smartx_save_review.items` 里所有检查项的 status 都是 `passed`，才算审查完全通过；只要任一项是 `warning`、`failed` 或 `error`，都按未通过处理。",
    "7. 如果保存后的审查结果存在非 `passed` 项，主 agent 必须自己修复代码，不要让 `strategy-reviewer` 代修。",
    "8. 第 1、2 轮审查只要存在非 `passed` 项，保存后必须修复，并在修复完成后再次调用 `strategy-reviewer` 复审。",
    "9. 第 3 轮如果全部 `passed`，保存后进入后续收口；如果第 3 轮仍有非 `passed` 项，也必须先保存，再完成最后一次修复，然后直接给出最终结论，不再自动发起第 4 轮复审。",
    "10. 审查全部通过并保存后，只有系统配置启用了 workspace baseline，工作流才会要求重新分析当前代码并重新生成流程图。",
    "11. `smartx_save_review` 的 `summary`、`items`、`items[].name`、`items[].detail`、`items[].suggestion`、`suggestions` 必须使用中文。",
    "12. MCP 保存成功后，再用中文简短回复用户审查结果和已执行的修复概况。",
    "",
    "建议优先复用这些 item name：需求覆盖情况、语法与运行时错误、策略逻辑完整性、入场逻辑、退出逻辑、仓位管理、风控规则、边界条件、订单管理、状态管理、生命周期管理、代码可维护性。",
  ].join("\n")
}

/** 生成“先做 workspace 分析”的系统提示。 */
export function noteAnalysis() {
  return [
    "当前工作区还没有完成策略运行逻辑分析。",
    "在正式修改代码、生成实现方案或调用写入类工具前，必须先调用 `task` 工具启动 `workspace-analyzer` 子 agent。",
    "调用参数要求：`subagent_type` 必须是 `workspace-analyzer`，`description` 使用 `Analyze strategy execution flow`。",
    "子 agent 只负责输出可画成流程图的 JSON 字符串数组，不要读取 requirements，不要描述项目结构、版本、UI、构建方式或文件职责，也不要修改文件。",
    "蓝图面向不写代码的策略研究、交易和运营人员。源码只用于确认事实，输出必须使用自然的业务语言，让读者无需了解代码也能看懂。",
    "不得出现文件名、函数名、变量名、参数名、枚举名、调用语法或 Python、JavaScript、SDK、API 等开发术语；必须把它们改写成触发条件、市场信息、指标计算、交易动作、风控规则和状态结果。",
    "例如，把“调用一分钟行情查询函数”写成“读取前复权的一分钟历史行情”，把“注册报价回调”写成“每次收到新报价后重新判断交易信号”。",
    "如果当前工作区只是模板骨架或策略还不完整，子 agent 也必须明确指出实际已实现的行为与缺失的规则。",
    "子 agent 必须只返回 JSON 数组，例如 `[\"当前策略尚未形成完整交易逻辑\"]`，不要输出 markdown、标题、解释或代码块。",
    "子 agent 返回后，主 agent 再基于它的结果继续当前任务。",
    "这一步和 requirements 无关，不要把需求清单混进分析结果。",
  ].join("\n")
}

/** 生成首次进入 workspace 时的基线初始化提示。 */
export function noteBoot() {
  return [
    "当前会话还没有完成这个工作区的初始化基线。",
    "初始化基线必须先完成两步：先调用 `workspace-analyzer`，再调用 `strategy-flowchart-generator`。",
    "在初始化基线完成前，不要修改代码，也不要执行会改变工作区的命令。",
    "你可以继续做只读探索，例如读取文件、搜索代码和查看目录。",
    "请先调用 `task` 工具启动 `workspace-analyzer` 子 agent，`subagent_type` 使用 `workspace-analyzer`，`description` 使用 `Analyze strategy execution flow`。",
  ].join("\n")
}

/** 生成 project memory 恢复或初始化提示。 */
export function noteResumeProject(hasProjectState: boolean) {
  return [
    "当前会话还没有完成项目记忆恢复，不能直接进入持续开发、调试、审查或最终收口。",
    hasProjectState
      ? "请先调用 strategy-service MCP 工具 `resume_project_state`，恢复 `.project-state/` 里的当前阶段、当前任务、下一步和风险。"
      : "当前工作区还没有 `.project-state/`，请先调用 strategy-service MCP 工具 `init_project_state` 完成初始化。",
    "在项目记忆恢复完成前，你可以继续做只读探索，但不要修改代码、不要启动实现型子 agent，也不要发起调试或代码审查。",
  ].join("\n")
}

/** 生成 project memory 需要保存时的提醒。 */
export function noteSaveProject() {
  return [
    "当前工作区已经产生了新的推进，但项目记忆还没有同步到 `.project-state/`。",
    "如果你准备收尾、输出最终总结、交接状态或自然结束这一轮，请先调用 strategy-service MCP 工具 `save_project_state`。",
    "保存内容至少要覆盖：当前阶段、当前任务、本次进展摘要、下一步、风险、是否已验证，并把 `dirty` 设为 `false`。",
    "在项目记忆保存完成前，不要直接给出最终总结。",
  ].join("\n")
}

/** 生成 workspace 基线过期后的刷新提示。 */
export function noteRefresh(action = "后续步骤") {
  return [
    "当前工作区代码已经发生变化，上一轮分析和流程图基线已经过期。",
    `继续执行 ${action} 前，必须先刷新基线：重新运行 workspace 分析，并重新生成流程图。`,
    "刷新顺序必须是：先调用 `workspace-analyzer` 并保存分析结果；再调用 `strategy-flowchart-generator` 并保存流程图结果。",
    "刷新期间可以继续做只读探索，但不要继续修改代码，也不要开始审查或调试。",
  ].join("\n")
}

/** 生成最终收口前的最后一次基线刷新提示。 */
export function noteFinal() {
  return [
    "当前工作区代码已经发生变化，已保存的分析和流程图不再代表最终状态。",
    "现在进入最终收口阶段：先最后刷新一次 workspace 分析和流程图，再给出最终总结。",
    "刷新顺序必须是：先调用 `workspace-analyzer`，保存分析结果；再调用 `strategy-flowchart-generator`，保存流程图结果。",
    "最终快照保存完成前，可以继续做只读检查，但不要再修改代码，也不要继续发起新的调试。",
  ].join("\n")
}

/** 生成自然收尾前的自动 close 提示。 */
export function noteClose() {
  return [
    "当前工作区代码已经发生变化，已保存的分析和流程图已经落后。",
    "如果这一轮准备直接结束工作、给出收尾回复或最终总结，先不要直接输出文本。",
    "此时必须先做最后一次 workspace 快照刷新：先调用 `workspace-analyzer` 并保存分析，再调用 `strategy-flowchart-generator` 并保存流程图。",
    "只有当你明确判断这一轮还要继续修改代码、继续调试或继续探索时，才可以暂时不执行这个收口刷新。",
  ].join("\n")
}

/** 生成从 analysis 进入 flowchart 阶段的提示。 */
export function noteChart(input: Analysis) {
  return [
    "workspace-analyzer 已经完成当前工作区的策略运行逻辑分析。现在必须先生成策略逻辑流程图，再继续其他实现或总结。",
    "请立刻调用 `task` 工具启动 `strategy-flowchart-generator` 子 agent。",
    "调用参数要求：`subagent_type` 必须是 `strategy-flowchart-generator`，`description` 使用 `Generate strategy flowchart`。",
    "传给子 agent 的 prompt 必须包含下面这份 workspace-analyzer JSON 结果，并要求它只读代码来校验、修正和补充。",
    "子 agent 可以读取源码、列目录和搜索文本；不能修改文件，不能执行命令，也不能调用其他子 agent。",
    "不要加入 requirements、用户愿望清单或未来实现计划作为流程图来源。",
    "子 agent 必须只返回 Mermaid flowchart，第一行是 `flowchart TD`，不要 markdown 代码块，不要解释。",
    "",
    "workspace-analyzer JSON 结果：",
    input.summaryText,
  ].join("\n")
}

/** 生成 review 失败后的修复指令，并控制最多修复轮数。 */
export function noteFix(input: Fix) {
  const last = input.attempt >= limit
  return [
    "最新一轮 SmartX 策略审查未通过，而且该轮结果已经通过 `smartx_save_review` 保存。",
    "你是主 agent，必须自己根据审查报告修复代码。",
    `这是第 ${input.attempt} 次修复，最多 ${limit} 次。`,
    "规则：",
    "- 阅读下面的审查报告，修改当前工作区代码，解决报告中的具体问题。",
    "- 修改范围聚焦在 SmartX 策略缺陷和用户需求上。",
    "- 修改后，从对应 package 或项目目录运行合理的本地验证。",
    last
      ? "- 这是最后一次自动修复。不要再调用 `strategy-reviewer`；验证后直接用中文给出最终结论，并总结第 3 轮审查结果和最后修复内容。"
      : "- 然后再次调用 `task` 工具，使用 `subagent_type: strategy-reviewer` 和 `description: Review strategy implementation` 进行复审。",
    last ? "" : "- 传给 reviewer 的 prompt 必须包含相同的需求上下文，以及本轮修复摘要。",
    "- 在新的 `strategy-reviewer` 审查完成前，不要再次调用 `smartx_save_review`。",
    "",
    "待修复的审查报告：",
    input.reviewText,
  ]
    .filter(Boolean)
    .join("\n")
}

/** 根据 pending 类型生成对应的“先保存再继续”提示。 */
export function noteSave(input: Pending) {
  if (input.kind === "analysis") {
    return [
      "工作区分析任务已经完成。继续之前，必须调用 strategy-service MCP 工具 `smartx_save_analysis`，参数严格使用下面这段 JSON：",
      JSON.stringify(
        {
          workspacePath: input.workspacePath,
          worktreePath: input.worktreePath,
          state: "done",
          items: input.summaryItems,
          text: input.summaryText,
        },
        null,
        2,
      ),
      "MCP 保存成功后，再继续当前任务。",
    ].join("\n")
  }
  if (input.kind === "review") {
    return [
      "策略审查任务已经完成。继续之前，必须把下面的中文审查报告转换成 strategy-service MCP 工具 `smartx_save_review` 的严格 JSON 参数并保存。",
      "固定字段：",
      `- reviewId: ${input.reviewId}`,
      `- sessionId: ${input.sessionId}`,
      `- workspacePath: ${input.workspacePath}`,
      `- worktreePath: ${input.worktreePath}`,
      `- state: ${input.state}`,
      "生成字段：",
      "- state：根据 items 严格聚合；error 优先，其次 failed/warning，全部通过才是 passed",
      "- summary：简洁的中文审查摘要",
      "- items：中文检查项数组，每项包含 name、status、detail、suggestion",
      "- suggestions：中文建议数组",
      "规则：",
      "- 所有自然语言字段都必须使用中文。",
      "- 忠实转换审查报告内容，不要编造额外问题。",
      "- item status 只能使用 `passed`、`warning`、`failed`、`error`。",
      `- reviewer 解析状态为 \`${input.state}\`，最终 state 不得比它更轻。`,
      "",
      "审查报告：",
      input.reviewText,
      "MCP 保存成功后，再继续当前任务。",
    ].join("\n")
  }
  return [
    "策略流程图任务已经完成。继续之前，必须调用 strategy-service MCP 工具 `smartx_save_flowchart`，参数严格使用下面这段 JSON：",
    JSON.stringify(
      {
        workspacePath: input.workspacePath,
        worktreePath: input.worktreePath,
        state: input.state,
        code: input.mermaidCode,
        err: input.errorText,
      },
      null,
      2,
    ),
    "MCP 保存成功后，再继续当前任务。",
  ].join("\n")
}
