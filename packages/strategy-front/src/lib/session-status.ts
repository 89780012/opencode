import type { ChatStatus } from "@/types/chat"

export function retry(status: ChatStatus) {
  if (status.type !== "retry") return
  return status
}
