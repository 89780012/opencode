import type { Plugin } from "@opencode-ai/plugin"
import { build } from "./hooks.js"

/** 插件入口：把 SmartX workflow hooks 暴露给 opencode。 */
export const SmartxWorkflow: Plugin = async (input) => {
  return build(input)
}

export default SmartxWorkflow
