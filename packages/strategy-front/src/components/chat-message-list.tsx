import { memo } from "react"
import { CheckCircle2, Circle, ListTodo, LoaderCircle, MinusCircle } from "lucide-react"
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import { Response } from "@/components/ai-elements/response"
import { cn } from "@/lib/utils"
import type { ChatPart, ChatStatus, ChatTodo, ChatToolPart, ChatToolState, ChatView } from "@/types/chat"

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

function todos(state: ChatToolState) {
  if (!("metadata" in state)) return
  const value = state.metadata?.todos
  if (!Array.isArray(value)) return
  return value.filter(
    (item): item is ChatTodo =>
      !!item &&
      typeof item === "object" &&
      "content" in item &&
      "status" in item &&
      typeof item.content === "string" &&
      typeof item.status === "string",
  )
}

function count(list?: ChatTodo[]) {
  if (!list) return
  return {
    total: list.length,
    active: list.filter((item) => item.status !== "completed" && item.status !== "cancelled").length,
    done: list.filter((item) => item.status === "completed").length,
  }
}

function todoIcon(status: string) {
  if (status === "completed") return <CheckCircle2 className="size-4 text-emerald-600" />
  if (status === "running") return <LoaderCircle className="size-4 animate-spin text-sky-600" />
  if (status === "error") return <MinusCircle className="size-4 text-red-600" />
  return <Circle className="size-4 text-muted-foreground" />
}

function todoText(tool: string, state: ChatToolState) {
  const list = count(todos(state))
  if (state.status === "pending") {
    return tool === "todowrite" ? "Preparing todo update" : "Preparing todo read"
  }
  if (state.status === "running") {
    return tool === "todowrite" ? "Updating todo list" : "Reading todo list"
  }
  if (state.status === "error") {
    return tool === "todowrite" ? "Todo update failed" : "Todo read failed"
  }
  if (!list) {
    return tool === "todowrite" ? "Todo list updated" : "Todo list loaded"
  }
  if (tool === "todowrite") {
    return list.active > 0
      ? `Todo list updated · ${list.active} active / ${list.total} total`
      : `Todo list updated · ${list.done} done`
  }
  return list.active > 0
    ? `Todo list loaded · ${list.active} active / ${list.total} total`
    : `Todo list loaded · ${list.done} done`
}

function renderTodoTool(part: ChatToolPart) {
  const state = part.state
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
        state.status === "error" ? "border-red-200 bg-red-50 text-red-700" : "bg-muted/20 text-muted-foreground",
      )}
    >
      <div className="shrink-0">
        {state.status === "completed" ? <ListTodo className="size-4 text-muted-foreground" /> : todoIcon(state.status)}
      </div>
      <div className="min-w-0 flex-1 truncate">
        {todoText(part.tool, state)}
      </div>
      <div className="shrink-0 uppercase tracking-[0.08em] text-[10px]">
        {state.status}
      </div>
    </div>
  )
}

function renderTool(part: ChatToolPart) {
  const state = part.state
  if (part.tool === "todowrite" || part.tool === "todoread") {
    return renderTodoTool(part)
  }
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
