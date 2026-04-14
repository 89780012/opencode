import { memo, useState, type ReactNode } from "react"
import { CheckCircle2, ChevronDown, Circle, ListTodo, LoaderCircle, MinusCircle } from "lucide-react"
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import { Response } from "@/components/ai-elements/response"
import { cn } from "@/lib/utils"
import { selectSessionParts, useAppSelector } from "@/store"
import type {
  ChatError,
  ChatMessageInfo,
  ChatPart,
  ChatStatus,
  ChatTodo,
  ChatToolPart,
  ChatToolState,
} from "@/types/chat"

const pane = "custom-scrollbar mt-2 max-h-64 space-y-2 overflow-y-auto pr-1"
const empty: ChatPart[] = []

interface Props {
  messages: ChatMessageInfo[]
  status?: ChatStatus
  err?: string
  loading?: boolean
  onOpenDiff?: (file: string) => void
  footer?: ReactNode
}

function errorText(err?: ChatError) {
  const msg = err?.data?.message
  if (typeof msg === "string" && msg) {
    return msg
  }
  return err?.name
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
      ? `Todo list updated 路 ${list.active} active / ${list.total} total`
      : `Todo list updated 路 ${list.done} done`
  }
  return list.active > 0
    ? `Todo list loaded 路 ${list.active} active / ${list.total} total`
    : `Todo list loaded 路 ${list.done} done`
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
      <div className="min-w-0 flex-1 truncate">{todoText(part.tool, state)}</div>
      <div className="shrink-0 uppercase tracking-[0.08em] text-[10px]">{state.status}</div>
    </div>
  )
}

function Fold(props: { head: ReactNode; side?: ReactNode; body: ReactNode; open?: boolean; tone?: string }) {
  const [open, setOpen] = useState(!!props.open)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border px-3 py-2 text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        props.tone,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">{props.head}</div>
        <div className="flex shrink-0 items-center gap-2">
          {props.side}
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              open ? "rotate-180" : "",
            )}
          />
        </div>
      </button>
      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "grid-rows-[1fr] pt-2 opacity-100" : "grid-rows-[0fr] pt-0 opacity-0",
        )}
      >
        <div className="min-h-0">{props.body}</div>
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
    <Fold
      tone="bg-muted/30"
      head={<div className="font-medium">工具调用: {part.tool}</div>}
      side={<div className="text-muted-foreground text-xs">{state.status}</div>}
      body={
        <div className={pane}>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {JSON.stringify(state.input, null, 2)}
          </pre>
          {"output" in state && state.output ? (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">{state.output}</pre>
          ) : null}
          {"error" in state && state.error ? <div className="text-xs text-red-600">{state.error}</div> : null}
        </div>
      }
    />
  )
}

function renderPart(part: ChatPart, role: ChatMessageInfo["role"], onOpenDiff?: (file: string) => void) {
  switch (part.type) {
    case "text":
      if (role === "assistant") {
        return <Response>{part.text}</Response>
      }
      return <div className="whitespace-pre-wrap break-words">{part.text}</div>
    case "reasoning":
      return (
        <Fold
          tone="bg-muted/20"
          head={<div className="font-medium">思考中</div>}
          body={<div className={cn(pane, "whitespace-pre-wrap break-words text-muted-foreground")}>{part.text}</div>}
        />
      )
    case "tool":
      return renderTool(part)
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
        <Fold
          tone="bg-muted/20"
          head={<div className="font-medium">Snapshot</div>}
          body={
            <pre className={cn(pane, "overflow-x-auto whitespace-pre-wrap break-words text-xs")}>{part.snapshot}</pre>
          }
        />
      )
    case "patch":
      return (
        <Fold
          head={<span className="font-medium">Patch {part.hash}</span>}
          side={<span className="text-xs text-muted-foreground">{part.files.length} files</span>}
          body={
            <div className={cn(pane, "flex flex-wrap content-start gap-2")}>
              {part.files.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onOpenDiff?.(item)}
                  className={cn(
                    "rounded px-2 py-1 text-xs transition-colors",
                    onOpenDiff ? "bg-muted hover:bg-primary/10 hover:text-foreground" : "bg-muted",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          }
        />
      )
    case "agent":
      return <div className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">Agent: {part.name}</div>
    case "retry":
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          重试 #{part.attempt}: {String(part.error.data.message ?? part.error.name)}
        </div>
      )
    case "compaction":
      return (
        <div className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">
          上下文压缩{part.overflow ? " due to overflow" : ""}
        </div>
      )
  }
}

const ChatMessageItem = memo(function ChatMessageItem(props: {
  info: ChatMessageInfo
  onOpenDiff?: (file: string) => void
}) {
  const parts = useAppSelector((state) => selectSessionParts(state, props.info.id))
  const body = parts.length > 0 ? parts : empty
  const err = props.info.role === "assistant" ? errorText(props.info.error) : undefined

  if (body.length === 0 && !err) {
    return null
  }

  return (
    <Message from={props.info.role}>
      <MessageContent>
        {body.map((part) => (
          <div key={part.id}>{renderPart(part, props.info.role, props.onOpenDiff)}</div>
        ))}
        {err ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
        ) : null}
      </MessageContent>
    </Message>
  )
})

export const ChatMessageList = memo(function ChatMessageList(props: Props) {
  return (
    <Conversation className="custom-scrollbar-2 h-full min-w-0 flex-1">
      <ConversationContent className="mx-auto min-w-0 w-full max-w-[776px]">
        {props.messages.map((info) => (
          <ChatMessageItem key={info.id} info={info} onOpenDiff={props.onOpenDiff} />
        ))}
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
            <MessageContent>
              <div className="flex py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            </MessageContent>
          </Message>
        ) : null}
        {props.status?.type === "retry" ? (
          <Message from="assistant">
            <MessageContent>
              重试中 #{props.status.attempt}: {props.status.message}
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
})
