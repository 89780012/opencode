import type { ChatInputPart } from "@/types/chat";

export function buildRequestParts(text: string): ChatInputPart[] {
  const value = text.trim();
  if (!value) {
    return [];
  }

  return [
    {
      type: "text",
      text: value,
    },
  ];
}
