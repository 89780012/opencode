import type { ChatInputPart, PromptInputMessage } from "@/types/chat"

export function buildRequestParts(input: PromptInputMessage): ChatInputPart[] {
  const text = input.text.trim()
  if (!text) return []

  return [
    {
      type: "text",
      text,
    },
  ]
}
