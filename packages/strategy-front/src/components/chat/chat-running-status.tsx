import { useEffect, useState } from "react"
import { Message, MessageContent } from "@/components/ai-elements/message"
import { selectSessionParts, useAppSelector } from "@/store"
import type { ChatMessageInfo, ChatPart, ChatStatus, ChatToolPart } from "@/types/chat"

type Props = {
  messages: ChatMessageInfo[]
  status?: ChatStatus
}

type Item = {
  id: string
  tool: string
  status: "pending" | "running"
  title?: string
  desc?: string
  cmd?: string
  out?: string
  start?: number
}

const detail = new Set(["bash", "websearch", "web_search", "web_search_preview"])

function text(value: unknown) {
  if (typeof value !== "string") return
  const next = value.trim()
  if (!next) return
  return next
}

function cut(value?: string, size = 220) {
  if (!value) return
  if (value.length <= size) return value
  return value.slice(0, size - 1) + "..."
}

function tail(value?: string) {
  if (!value) return
  const list = value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (list.length === 0) return cut(value.trim(), 220)
  return cut(list[list.length - 1], 220)
}

function active(parts: ChatPart[]) {
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i]
    if (part.type !== "tool") continue
    if (part.state.status !== "running" && part.state.status !== "pending") continue
    return part
  }
}

function info(part?: ChatToolPart): Item | undefined {
  if (!part) return
  const state = part.state
  if (state.status !== "running" && state.status !== "pending") return
  return {
    id: part.id,
    tool: part.tool,
    status: state.status,
    title: state.status === "running" ? text(state.title) : undefined,
    desc: text(state.input.description),
    cmd: part.tool === "bash" ? text(state.input.command) : undefined,
    out: state.status === "running" ? text(state.metadata?.output) : undefined,
    start: state.status === "running" ? state.time.start : undefined,
  }
}

function span(start?: number, now?: number) {
  if (!start || !now) return
  const sec = Math.max(0, Math.floor((now - start) / 1000))
  const min = Math.floor(sec / 60)
  const rest = sec % 60
  if (min <= 0) return `${rest}s`
  return `${min}m ${rest}s`
}

function title(item?: Item) {
  if (!item) return "正在处理当前请求"
  if (item.tool === "bash") return item.desc || item.title || "正在执行系统命令"
  return item.title || `正在运行 ${item.tool}`
}

function desc(item?: Item) {
  if (!item) return "助手仍在处理中，短时间没有新输出不一定表示卡住。"
  if (item.out) return `最新输出：${tail(item.out)}`
  if (item.status === "pending") return "当前工具已进入执行队列，正在等待开始。"
  if (item.tool === "bash") return "命令已经启动，正在等待首条输出。长时间无输出不一定表示卡住。"
  return "当前工具仍在运行，请稍候。"
}

export function ChatRunningStatus(props: Props) {
  const [now, setNow] = useState(() => Date.now())
  const item = useAppSelector((state) => {
    for (let i = props.messages.length - 1; i >= 0; i -= 1) {
      const msg = props.messages[i]
      const part = active(selectSessionParts(state, msg.id))
      const next = info(part)
      if (next) return next
    }
  })
  const busy = props.status?.type === "busy"
  const full = !!item && detail.has(item.tool)

  useEffect(() => {
    if (!item?.start || !busy) return
    setNow(Date.now())
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      window.clearInterval(timer)
    }
  }, [busy, item?.id, item?.start])

  if (!busy) return null
  if (!item || !full) {
    return (
      <Message from="assistant">
        <MessageContent>
          <div className="flex py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </MessageContent>
      </Message>
    )
  }

  return (
    <Message from="assistant">
      <MessageContent>
        <div className="chat-run" data-tool={item.tool} data-status={item.status}>
          <div className="chat-run-head">
            <span className="chat-run-spin" aria-hidden="true" />
            <div className="chat-run-copy">
              <div className="chat-run-title">{title(item)}</div>
              <div className="chat-run-desc">{desc(item)}</div>
            </div>
          </div>
          {item.cmd ? (
            <pre className="chat-run-cmd">
              <span className="chat-run-sign">$</span>
              <span>{cut(item.cmd, 300)}</span>
            </pre>
          ) : null}
          <div className="chat-run-meta">
            <span className="chat-run-tag">{item.tool}</span>
            <span className="chat-run-tag">{item.status === "pending" ? "waiting" : "running"}</span>
            {item.start ? <span className="chat-run-tag">已运行 {span(item.start, now)}</span> : null}
          </div>
        </div>
      </MessageContent>
    </Message>
  )
}
