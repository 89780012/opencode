import { memo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Check, CheckCircle2, ChevronDown, Circle, Copy, ListTodo, LoaderCircle, MinusCircle } from "lucide-react"
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import { Response } from "@/components/ai-elements/response"
import { ChatRunningStatus } from "@/components/chat/chat-running-status"
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
const fail = "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
const abort =
  "chat-abort border-slate-200 bg-slate-50 text-slate-600 dark:border-[#2a312f] dark:bg-[#171d1b] dark:text-[#aab6b0]"
const card =
  "chat-inline-card border-slate-200 bg-slate-50 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-[#2a312f] dark:bg-[#171b1a] dark:text-[#dbe5e1] dark:shadow-none"
const note = "text-slate-500 dark:text-[#93a29b]"
const ansi = /\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g

interface Props {
  messages: ChatMessageInfo[]
  status?: ChatStatus
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

function abortText(value?: string) {
  if (!value) return false
  return value.trim().toLowerCase() === "aborted"
}

function interrupted(info?: ChatMessageInfo) {
  return info?.role === "assistant" && info.error?.name === "MessageAbortedError"
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
      ? `Todo list updated  ${list.active} active / ${list.total} total`
      : `Todo list updated  ${list.done} done`
  }
  return list.active > 0
    ? `Todo list loaded  ${list.active} active / ${list.total} total`
    : `Todo list loaded  ${list.done} done`
}

function renderTodoTool(part: ChatToolPart) {
  const state = part.state
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
        state.status === "error" ? fail : card,
      )}
    >
      <div className="shrink-0">
        {state.status === "completed" ? <ListTodo className="size-4 text-muted-foreground" /> : todoIcon(state.status)}
      </div>
      <div className="min-w-0 flex-1 truncate">{todoText(part.tool, state)}</div>
      <div className={cn("shrink-0 uppercase tracking-[0.08em] text-[10px]", note)}>{state.status}</div>
    </div>
  )
}

function text(value: unknown) {
  if (typeof value !== "string") return
  const next = value.trim()
  if (!next) return
  return next
}

function clean(value?: string) {
  if (!value) return ""
  return value.replace(ansi, "")
}

function bashCmd(part: ChatToolPart) {
  return text(part.state.input.command)
}

function bashDesc(part: ChatToolPart) {
  return text(part.state.input.description)
}

function bashDir(part: ChatToolPart) {
  const dir = text(part.state.input.workdir)
  if (!dir || dir === ".") return
  return dir
}

function bashOut(part: ChatToolPart) {
  if (part.state.status === "running") {
    return clean(text(part.state.metadata?.output))
  }
  if ("output" in part.state) {
    return clean(text(part.state.output))
  }
  return ""
}

function bashErr(part: ChatToolPart, halted?: boolean) {
  if (halted && (part.state.status === "running" || part.state.status === "pending")) return "Aborted"
  if ("error" in part.state) return text(part.state.error)
}

function bashTitle(part: ChatToolPart) {
  const desc = bashDesc(part)
  const dir = bashDir(part)
  if (!desc && !dir) return "Shell"
  if (!desc) return `Shell in ${dir}`
  if (!dir || desc.includes(dir)) return desc
  return `${desc} in ${dir}`
}

function bashMeta(part: ChatToolPart, halted?: boolean) {
  if (halted && (part.state.status === "running" || part.state.status === "pending")) return "Command aborted"
  if (part.state.status === "pending") return "Waiting for command to start"
  if (part.state.status === "running") return "Streaming output"
  if (part.state.status === "completed") return "Command finished"
  return "Command failed"
}

function searchQuery(part: ChatToolPart) {
  return text(part.state.input.query)
}

function searchOut(part: ChatToolPart) {
  if ("output" in part.state) return clean(text(part.state.output))
  return ""
}

function searchErr(part: ChatToolPart, halted?: boolean) {
  if (halted && (part.state.status === "running" || part.state.status === "pending")) return "Aborted"
  if ("error" in part.state) return text(part.state.error)
}

function searchTitle(part: ChatToolPart) {
  if (part.tool === "codesearch") return "Code search"
  return "Web search"
}

function searchMeta(part: ChatToolPart, hits: number, halted?: boolean) {
  if (halted && (part.state.status === "running" || part.state.status === "pending")) return "Search aborted"
  if (part.state.status === "pending") return "Waiting to start search"
  if (part.state.status === "running") return "Searching..."
  if (part.state.status === "error") return "Search failed"
  if (hits > 0) return `${hits} links found`
  return "Search finished"
}

function stale(part: ChatToolPart, halted?: boolean) {
  return !!halted && (part.state.status === "running" || part.state.status === "pending")
}

function urls(value?: string) {
  if (!value) return []
  const seen = new Set<string>()
  const list = value.match(/https?:\/\/[^\s)>\]]+/g) ?? []
  return list.filter((item) => {
    if (seen.has(item)) return false
    seen.add(item)
    return true
  })
}

function BashTool(props: { part: ChatToolPart; halted?: boolean }) {
  const part = props.part
  const cmd = bashCmd(part)
  const out = bashOut(part)
  const err = bashErr(part, props.halted)
  const lines = out ? out.split(/\r?\n/) : []
  const more = lines.length > 10
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const stop = stale(part, props.halted)
  const run = !stop && part.state.status === "running"
  const body = open || !more ? out : [...lines.slice(0, 10), "..."].join("\n")

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => {
      setCopied(false)
    }, 2000)
    return () => {
      window.clearTimeout(timer)
    }
  }, [copied])

  const copy = () => {
    const next = [cmd ? `$ ${cmd}` : "", out].filter(Boolean).join("\n\n")
    if (!next) return
    void navigator.clipboard.writeText(next).then(() => {
      setCopied(true)
    })
  }

  return (
    <div
      className={cn("chat-run", part.state.status === "error" || stop ? "chat-run-state-error" : "")}
      data-tool="bash"
      data-status={stop ? "aborted" : part.state.status}
    >
      <div className="chat-run-head chat-run-head-wide">
        {run ? (
          <span className="chat-run-spin" aria-hidden="true" />
        ) : (
          <div className="chat-run-mark" aria-hidden="true">
            $
          </div>
        )}
        <div className="chat-run-copy">
          <div className="chat-run-row">
            <div className="chat-run-main">
              <div className="chat-run-title">{bashTitle(part)}</div>
              <div className="chat-run-desc">{bashMeta(part, props.halted)}</div>
            </div>
            <button
              type="button"
              onClick={copy}
              className="chat-run-copy-btn"
              aria-label={copied ? "Copied command output" : "Copy command output"}
              title={copied ? "Copied" : "Copy"}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          {cmd ? (
            <pre className="chat-run-cmd">
              <span className="chat-run-sign">$</span>
              <span>{cmd}</span>
            </pre>
          ) : null}
          {out ? (
            <pre className="chat-run-output chat-run-output-shell custom-scrollbar">
              <code>{body}</code>
            </pre>
          ) : null}
          {err ? <div className="chat-run-error">{err}</div> : null}
          {more ? (
            <button type="button" onClick={() => setOpen((value) => !value)} className="chat-run-toggle">
              {open ? "Collapse output" : `Expand output (${lines.length} lines)`}
            </button>
          ) : null}
          <div className="chat-run-meta">
            <span className="chat-run-tag">bash</span>
            <span className="chat-run-tag">{stop ? "aborted" : part.state.status}</span>
            {bashDir(part) ? <span className="chat-run-tag">{bashDir(part)}</span> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function SearchTool(props: { part: ChatToolPart; halted?: boolean }) {
  const part = props.part
  const query = searchQuery(part)
  const out = searchOut(part)
  const err = searchErr(part, props.halted)
  const links = urls(out).slice(0, 6)
  const lines = out ? out.split(/\r?\n/) : []
  const more = lines.length > 12
  const [open, setOpen] = useState(false)
  const stop = stale(part, props.halted)
  const run = !stop && part.state.status === "running"
  const body = open || !more ? out : [...lines.slice(0, 12), "..."].join("\n")

  return (
    <div
      className={cn("chat-run", part.state.status === "error" || stop ? "chat-run-state-error" : "")}
      data-tool={part.tool}
      data-status={stop ? "aborted" : part.state.status}
    >
      <div className="chat-run-head chat-run-head-wide">
        {run ? (
          <span className="chat-run-spin" aria-hidden="true" />
        ) : (
          <div className="chat-run-mark" aria-hidden="true">
            {part.tool === "codesearch" ? "<>" : "%"}
          </div>
        )}
        <div className="chat-run-copy">
          <div className="chat-run-title">{searchTitle(part)}</div>
          <div className="chat-run-desc">{searchMeta(part, links.length, props.halted)}</div>
          {query ? (
            <pre className="chat-run-cmd">
              <span className="chat-run-sign">?</span>
              <span>{query}</span>
            </pre>
          ) : null}
          {out ? (
            <pre className="chat-run-output chat-run-output-search custom-scrollbar">
              <code>{body}</code>
            </pre>
          ) : null}
          {err ? <div className="chat-run-error">{err}</div> : null}
          {more ? (
            <button type="button" onClick={() => setOpen((value) => !value)} className="chat-run-toggle">
              {open ? "Collapse results" : "Expand results"}
            </button>
          ) : null}
          {links.length > 0 ? (
            <div className="chat-run-links">
              {links.map((item) => (
                <a key={item} href={item} target="_blank" rel="noreferrer" className="chat-run-link">
                  {item}
                </a>
              ))}
            </div>
          ) : null}
          <div className="chat-run-meta">
            <span className="chat-run-tag">{part.tool}</span>
            <span className="chat-run-tag">{stop ? "aborted" : part.state.status}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Fold(props: { head: ReactNode; side?: ReactNode; body: ReactNode; open?: boolean; tone?: string }) {
  const [open, setOpen] = useState(!!props.open)
  const body = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    if (!body.current) {
      return
    }
    setHeight(body.current.scrollHeight)
  }, [open, props.body])

  useEffect(() => {
    if (!open || !body.current) {
      return
    }

    if (typeof ResizeObserver === "undefined") {
      const sync = () => {
        if (!body.current) {
          return
        }
        setHeight(body.current.scrollHeight)
      }

      window.addEventListener("resize", sync)
      return () => {
        window.removeEventListener("resize", sync)
      }
    }

    const obs = new ResizeObserver(() => {
      if (!body.current) {
        return
      }
      setHeight(body.current.scrollHeight)
    })

    obs.observe(body.current)
    return () => {
      obs.disconnect()
    }
  }, [open])

  return (
    <div className={cn("chat-fold overflow-hidden rounded-xl border text-sm", card, props.tone)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="chat-fold-trigger flex min-h-11 w-full items-center justify-between gap-3 bg-transparent px-3 py-2.5 text-left appearance-none"
      >
        <div className="min-w-0 flex-1 leading-5">{props.head}</div>
        <div className="chat-fold-side flex shrink-0 items-center self-center gap-2 leading-none">
          {props.side}
          <ChevronDown
            className={cn(
              "shrink-0 self-center size-4 transition-transform duration-200 ease-out",
              note,
              open ? "rotate-180" : "",
            )}
          />
        </div>
      </button>
      <div
        className="chat-fold-shell overflow-hidden"
        style={{
          maxHeight: open ? `${height}px` : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div ref={body} className="chat-fold-body border-t border-slate-200 px-3 pb-3 pt-2 dark:border-[#2a312f]">
          {props.body}
        </div>
      </div>
    </div>
  )
}

function renderTool(part: ChatToolPart, halted?: boolean) {
  const state = part.state
  if (part.tool === "todowrite" || part.tool === "todoread") {
    return renderTodoTool(part)
  }
  if (part.tool === "bash") {
    return <BashTool part={part} halted={halted} />
  }
  if (
    part.tool === "websearch" ||
    part.tool === "codesearch" ||
    part.tool === "web_search" ||
    part.tool === "web_search_preview"
  ) {
    return <SearchTool part={part} halted={halted} />
  }
  return (
    <Fold
      tone=""
      head={<div className="font-medium">工具调用: {part.tool}</div>}
      side={<div className={cn("text-xs", note)}>{state.status}</div>}
      body={
        <div className={pane}>
          <pre className={cn("overflow-x-auto whitespace-pre-wrap break-words text-xs", note)}>
            {JSON.stringify(state.input, null, 2)}
          </pre>
          {"output" in state && state.output ? (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">{state.output}</pre>
          ) : null}
          {"error" in state && state.error ? (
            <div className="text-xs text-red-600 dark:text-red-300">{state.error}</div>
          ) : null}
        </div>
      }
    />
  )
}

function renderPart(
  part: ChatPart,
  role: ChatMessageInfo["role"],
  halted?: boolean,
  onOpenDiff?: (file: string) => void,
) {
  switch (part.type) {
    case "text":
      if (role === "assistant") {
        return <Response>{part.text}</Response>
      }
      return <div className="whitespace-pre-wrap break-words">{part.text}</div>
    case "reasoning":
      return (
        <Fold
          tone=""
          head={<div className="font-medium">思考中</div>}
          body={<div className={cn(pane, "whitespace-pre-wrap break-words", note)}>{part.text}</div>}
        />
      )
    case "tool":
      return renderTool(part, halted)
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
          tone=""
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
  const tone = abortText(err) ? abort : fail
  const halted = interrupted(props.info)

  if (body.length === 0 && !err) {
    return null
  }

  return (
    <Message from={props.info.role}>
      <MessageContent>
        {body.map((part) => (
          <div key={part.id}>{renderPart(part, props.info.role, halted, props.onOpenDiff)}</div>
        ))}
        {err ? <div className={cn("rounded-lg border px-3 py-2 text-sm", tone)}>{err}</div> : null}
      </MessageContent>
    </Message>
  )
})

export const ChatMessageList = memo(function ChatMessageList(props: Props) {
  return (
    <Conversation className="chat-scroll custom-scrollbar-2 h-full min-w-0 flex-1">
      <ConversationContent className="chat-body mx-auto min-w-0 w-full max-w-[776px]">
        {props.messages.map((info) => (
          <ChatMessageItem key={info.id} info={info} onOpenDiff={props.onOpenDiff} />
        ))}
        <ChatRunningStatus messages={props.messages} status={props.status} />
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
