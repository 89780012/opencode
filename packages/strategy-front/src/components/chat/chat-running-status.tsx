import { Message, MessageContent } from "@/components/ai-elements/message"
import { selectSessionParts, useAppSelector } from "@/store"
import type { ChatMessageInfo, ChatPart, ChatStatus } from "@/types/chat"

type Props = {
  messages: ChatMessageInfo[]
  status?: ChatStatus
}

function active(parts: ChatPart[]) {
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i]
    if (part.type !== "tool") continue
    if (part.state.status !== "running" && part.state.status !== "pending") continue
    return part
  }
}

export function ChatRunningStatus(props: Props) {
  const item = useAppSelector((state) => {
    for (let i = props.messages.length - 1; i >= 0; i -= 1) {
      const msg = props.messages[i]
      if (msg.role === "assistant" && msg.error?.name === "MessageAbortedError") continue
      const part = active(selectSessionParts(state, msg.id))
      if (part) return part
    }
  })
  const busy = props.status?.type === "busy"

  if (!busy || item) return null

  return (
    <Message from="assistant">
      <MessageContent>
        <div className="chat-run-mini flex items-center gap-2 py-2 text-sm text-slate-500 dark:text-[#93a29b]">
          <div className="chat-run-spin chat-run-spin-mini" aria-hidden="true" />
          <span>正在思考...</span>
        </div>
      </MessageContent>
    </Message>
  )
}
