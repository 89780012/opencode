import { memo } from "react"
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import { Response } from "@/components/ai-elements/response"
import type { ChatPart, ChatStatus, ChatToolPart, ChatView } from "@/types/chat"

interface Props {
  messages: ChatView[]
  status?: ChatStatus
  err?: string
  loading?: boolean
  hasCache?: boolean
}

function text(parts: ChatPart[]) {
  return parts
    .filter((part) => part.type === "text" || part.type === "reasoning")
    .map((part) => ("text" in part ? part.text : ""))
    .join("")
}

function renderTool(part: ChatToolPart) {
  const state = part.state
  return (
    <details className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <div className="font-medium">工具调用:{part.tool}</div>
        <div className="text-muted-foreground text-xs">{state.status}</div>
      </summary>
      <pre className="custom-scrollbar mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
        {JSON.stringify(state.input, null, 2)}
      </pre>
      {"output" in state && state.output ? (
        <pre className="custom-scrollbar mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs">
          {state.output}
        </pre>
      ) : null}
      {"error" in state && state.error ? <div className="mt-2 text-xs text-red-600">{state.error}</div> : null}
    </details>
  )
}

function renderPart(part: ChatPart, role: ChatView["info"]["role"]) {
  switch (part.type) {
    case "text":
      if (role === "assistant") {
        return <Response>{part.text}</Response>
      }
      return <div className="whitespace-pre-wrap break-words">{part.text}</div>
    case "reasoning":
      return (
        <details className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">思考中</summary>
          <div className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">{part.text}</div>
        </details>
      )
    case "tool":
      return renderTool(part)
    // case "step-start":
    //   return <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">Step started</div>
    // case "step-finish":
    //   return (
    //     <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
    //       <div className="font-medium">Step finished: {part.reason}</div>
    //       <div className="text-muted-foreground mt-1">
    //         tokens in/out/reasoning: {part.tokens.input}/{part.tokens.output}/{part.tokens.reasoning}
    //       </div>
    //     </div>
    //   )
    case "file":
      return (
        <div className="rounded-lg border px-3 py-2 text-xs">
          <div className="font-medium">{part.filename ?? part.url}</div>
          <div className="text-muted-foreground mt-1">{part.mime}</div>
        </div>
      )
    case "subtask":
      return (
        <div className="rounded-lg border px-3 py-2 text-sm">
          <div className="font-medium">{part.description}</div>
          <div className="text-muted-foreground mt-1 text-xs">agent: {part.agent}</div>
          <div className="mt-2 whitespace-pre-wrap break-words text-xs">{part.prompt}</div>
        </div>
      )
    case "snapshot":
      return (
        <details className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">Snapshot</summary>
          <pre className="custom-scrollbar mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs">
            {part.snapshot}
          </pre>
        </details>
      )
    case "patch":
      return (
        <div className="rounded-lg border px-3 py-2 text-sm">
          <div className="font-medium">Patch {part.hash}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {part.files.map((item) => (
              <span key={item} className="rounded bg-muted px-2 py-1 text-xs">
                {item}
              </span>
            ))}
          </div>
        </div>
      )
    case "agent":
      return <div className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">Agent: {part.name}</div>
    case "retry":
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Retry #{part.attempt}: {String(part.error.data.message ?? part.error.name)}
        </div>
      )
    case "compaction":
      return (
        <div className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">
          Context compacted{part.overflow ? " due to overflow" : ""}
        </div>
      )
  }
}

export const ChatMessageList = memo(function ChatMessageList(props: Props) {
  return (
    <Conversation className="custom-scrollbar flex-1" initial={props.hasCache ? "instant" : "smooth"}>
      <ConversationContent className="mx-auto w-full max-w-[776px]">
        {props.messages.map((message) => {
          const body =
            message.parts.length > 0
              ? message.parts
              : [
                  {
                    id: `${message.info.id}:text`,
                    sessionID: message.info.sessionID,
                    messageID: message.info.id,
                    type: "text" as const,
                    text: text(message.parts),
                  },
                ]

          return (
            <Message key={message.info.id} from={message.info.role}>
              <MessageContent>
                {body.map((part) => (
                  <div key={part.id}>{renderPart(part, message.info.role)}</div>
                ))}
              </MessageContent>
            </Message>
          )
        })}
        {props.err ? (
          <Message from="assistant">
            <MessageContent>
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {props.err}
              </div>
            </MessageContent>
          </Message>
        ) : null}
        {props.status?.type === "busy" ? (
          <Message from="assistant">
            <MessageContent>Loading...</MessageContent>
          </Message>
        ) : null}
        {props.status?.type === "retry" ? (
          <Message from="assistant">
            <MessageContent>
              Retry #{props.status.attempt}: {props.status.message}
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
})
