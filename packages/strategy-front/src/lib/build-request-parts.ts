import type { ChatInputPart, PromptInputMessage } from "@/types/chat";

export function buildRequestParts(input: PromptInputMessage): ChatInputPart[] {
  const text = input.text.trim();
  const parts: ChatInputPart[] = [];

  if (text) {
    parts.push({
      type: "text",
      text,
    });
  }

  input.files.forEach((file) => {
    parts.push({
      type: "file",
      mime: file.mime,
      url: file.url,
      filename: file.filename,
    });
  });

  return parts;
}
