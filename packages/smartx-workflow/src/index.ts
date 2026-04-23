import type { Plugin } from "@opencode-ai/plugin"
import { build } from "./hooks.js"

// 导出 SmartX 工作流插件入口，让 opencode 在加载插件时注册全部 hook。
export const SmartxWorkflow: Plugin = async (input) => {
  return build(input)
}

export default SmartxWorkflow
