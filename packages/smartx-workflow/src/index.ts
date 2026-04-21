import type { Plugin } from "@opencode-ai/plugin"
import { build } from "./hooks.js"

export const SmartxWorkflow: Plugin = async (input) => {
  return build(input)
}

export default SmartxWorkflow
