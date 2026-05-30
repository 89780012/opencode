import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Copy,
  Download,
  FileCode2,
  LoaderCircle,
  UserRound,
} from "lucide-react"
import { memo, useEffect, useRef, useState, type ReactNode } from "react"
import { Response } from "@/components/ai-elements/response"
import { selectSessionParts, useAppSelector } from "@/store"
import type { ChatMessageInfo, ChatPart, ChatStatus, ChatToolPart } from "@/types/chat"
import common from "../../styles/session/session-common.module.css"
import css from "../../styles/session/session-chat.module.css"

const empty: ChatPart[] = []
const ansi = /\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g
type Retry = Extract<ChatStatus, { type: "retry" }>

function clean(value?: string) {
  return value?.replace(ansi, "") ?? ""
}

function text(value: unknown) {
  if (typeof value !== "string") return ""
  return clean(value).trim()
}

function err(info: ChatMessageInfo) {
  if (info.role !== "assistant") return ""
  const msg = info.error?.data?.message
  if (typeof msg === "string" && msg) return msg
  return info.error?.name ?? ""
}

function internal(part: ChatPart) {
  return (
    part.type === "reasoning" ||
    part.type === "tool" ||
    part.type === "retry" ||
    part.type === "compaction" ||
    part.type === "agent"
  )
}

function time(value?: { start: number; end?: number }) {
  if (!value?.start || !value.end) return ""
  const sec = Math.max(1, Math.round((value.end - value.start) / 1000))
  return `用时 ${sec} 秒`
}

function Fold(props: {
  title: string
  children: ReactNode
  line?: boolean
  meta?: string
  state?: "running" | "done" | "error"
}) {
  const [open, setOpen] = useState(false)
  const state = props.state ?? "done"

  return (
    <div className={`${css.fold} ${css[`fold_${state}`]} ${props.line === false ? css.foldPlain : ""}`}>
      <button type="button" className={css.foldhead} onClick={() => setOpen((value) => !value)}>
        <span className={css.foldtitle}>
          {state === "running" ? (
            <LoaderCircle size={15} strokeWidth={2.3} className={common.spin} />
          ) : state === "error" ? (
            <CircleAlert size={15} strokeWidth={2.3} />
          ) : (
            <CheckCircle2 size={15} strokeWidth={2.3} />
          )}
          {props.title}
        </span>
        {props.meta ? <span className={css.foldmeta}>{props.meta}</span> : null}
        <ChevronDown size={14} className={open ? css.chevronon : ""} />
      </button>
      {open ? <div className={css.foldbody}>{props.children}</div> : null}
    </div>
  )
}

function output(part: ChatToolPart) {
  if (part.state.status === "running") return text(part.state.metadata?.output)
  if ("output" in part.state) return text(part.state.output)
  if ("error" in part.state) return text(part.state.error)
  return ""
}

function Tool(props: { part: ChatToolPart }) {
  const out = output(props.part)
  const cmd = text(props.part.state.input.command)
  const title =
    ("title" in props.part.state ? text(props.part.state.title) : "") ||
    text(props.part.state.input.description) ||
    props.part.tool
  const state =
    props.part.state.status === "running" || props.part.state.status === "pending"
      ? "running"
      : props.part.state.status === "error"
        ? "error"
        : "done"
  const label = state === "running" ? `正在调用 ${props.part.tool}` : state === "error" ? `${props.part.tool} 调用失败` : `已调用 ${props.part.tool}`

  return (
    <Fold title={label} line={false} meta={title !== props.part.tool ? title : undefined} state={state}>
      <div className={css.toolbody}>
        {cmd ? <CodeBlock lang="shell" value={`$ ${cmd}`} /> : null}
        {out ? <CodeBlock lang="text" value={out} /> : <div className={css.muted}>暂无输出</div>}
      </div>
    </Fold>
  )
}

function CodeBlock(props: { lang: string; value: string }) {
  return (
    <div className={css.codebox}>
      <div className={css.codehead}>
        <span>{props.lang}</span>
        <span className={css.codeactions}>
          <Download size={13} />
          <Copy size={13} />
        </span>
      </div>
      <pre className={css.codepre}>
        <code>{props.value}</code>
      </pre>
    </div>
  )
}

function Markdown(props: { children: string; className?: string }) {
  return (
    <Response
      className={`${css.markdown} ${props.className ?? ""}`}
      components={{
        code(input) {
          const props = input as {
            children?: ReactNode
            className?: string
            "data-block"?: string
          }
          const value = Array.isArray(props.children) ? props.children.join("") : String(props.children ?? "")
          const lang = /language-(\S+)/.exec(props.className ?? "")?.[1] ?? "text"
          if (props["data-block"]) return <CodeBlock lang={lang} value={value.trimEnd()} />
          return <code>{props.children}</code>
        },
      }}
    >
      {props.children}
    </Response>
  )
}

function proc(parts: ChatPart[]) {
  if (
    parts.some(
      (part) =>
        (part.type === "tool" && (part.state.status === "running" || part.state.status === "pending")) ||
        (part.type === "reasoning" && !part.time.end),
    )
  ) {
    return "running"
  }
  if (parts.some((part) => (part.type === "tool" && part.state.status === "error") || part.type === "retry")) {
    return "error"
  }
  return "done"
}

function meta(parts: ChatPart[]) {
  const tools = parts.filter((part): part is ChatToolPart => part.type === "tool").length
  if (!tools) return `${parts.length} 步`
  return `${parts.length} 步 · ${tools} 个工具`
}

function Process(props: { parts: ChatPart[]; onOpenDiff?: (file: string) => void }) {
  if (props.parts.length === 0) return null

  return (
    <Fold title="执行过程" line={false} meta={meta(props.parts)} state={proc(props.parts)}>
      <div className={css.process}>
        {props.parts.map((part) => (
          <Part key={part.id} part={part} role="assistant" onOpenDiff={props.onOpenDiff} />
        ))}
      </div>
    </Fold>
  )
}


function Part(props: { part: ChatPart; role: ChatMessageInfo["role"]; onOpenDiff?: (file: string) => void }) {
  if (props.part.type === "text") {
    if (props.role === "assistant") {
      return <Markdown>{props.part.text}</Markdown>
    }
    return <div className={css.text}>{props.part.text}</div>
  }
  if (props.part.type === "reasoning") {
    const done = !!props.part.time.end
    return (
      <Fold title={done ? "已思考" : "思考中"} meta={time(props.part.time)} state={done ? "done" : "running"}>
        <Markdown className={css.thought}>{props.part.text}</Markdown>
      </Fold>
    )
  }
  if (props.part.type === "tool") {
    return <Tool part={props.part} />
  }
  if (props.part.type === "patch") {
    return (
      <Fold title={`代码变更 ${props.part.hash}`} meta={`${props.part.files.length} files`}>
        <div className={css.patch}>
          {props.part.files.map((item) => (
            <button key={item} type="button" className={css.file} onClick={() => props.onOpenDiff?.(item)}>
              <FileCode2 size={13} />
              {item}
            </button>
          ))}
        </div>
      </Fold>
    )
  }
  if (props.part.type === "file") {
    return (
      <Fold title={props.part.filename ?? props.part.url} meta={props.part.mime}>
        <div className={css.muted}>{props.part.url}</div>
      </Fold>
    )
  }
  if (props.part.type === "subtask") {
    return (
      <Fold title={props.part.description} meta={props.part.agent}>
        <Markdown>{props.part.prompt}</Markdown>
      </Fold>
    )
  }
  if (props.part.type === "snapshot") {
    return (
      <Fold title="Snapshot">
        <CodeBlock lang="text" value={props.part.snapshot} />
      </Fold>
    )
  }
  if (props.part.type === "retry") {
    return (
      <Fold title={`重试 #${props.part.attempt}`} meta={String(props.part.error.name)} state="error">
        <div className={css.warn}>{String(props.part.error.data.message ?? props.part.error.name)}</div>
      </Fold>
    )
  }
  if (props.part.type === "compaction") {
    return <div className={css.muted}>上下文已压缩{props.part.overflow ? "，原因是上下文溢出" : ""}</div>
  }
  if (props.part.type === "agent") {
    return <div className={css.muted}>Agent: {props.part.name}</div>
  }
  return null
}

const Item = memo(function Item(props: { info: ChatMessageInfo; onOpenDiff?: (file: string) => void }) {
  const parts = useAppSelector((state) => selectSessionParts(state, props.info.id))
  const body = parts.length > 0 ? parts : empty
  const msg = err(props.info)
  const user = props.info.role === "user"
  const main = user ? body : body.filter((part) => !internal(part))
  const logs = user ? empty : body.filter(internal)

  if (body.length === 0 && !msg) return null

  return (
    <article className={`${css.msg} ${user ? css.user : css.ai}`}>
      {user ? (
        <div className={css.avatar}>
          <UserRound size={14} />
        </div>
      ) : null}
      <div className={css.card}>
        <Process parts={logs} onOpenDiff={props.onOpenDiff} />
        {main.map((part) => (
          <Part key={part.id} part={part} role={props.info.role} onOpenDiff={props.onOpenDiff} />
        ))}
        {msg ? (
          <Fold title="回复失败" state="error">
            <div className={css.warn}>{msg}</div>
          </Fold>
        ) : null}
      </div>
    </article>
  )
})

export function SessionMessageList(props: {
  loading?: boolean
  messages: ChatMessageInfo[]
  status: ChatStatus
  onOpenDiff?: (file: string) => void
}) {
  const body = useRef<HTMLDivElement | null>(null)
  const [retry, setRetry] = useState<Retry | null>(null)
  const stamp = useAppSelector((state) =>
    props.messages
      .map((info) => {
        const parts = selectSessionParts(state, info.id)
        const part = parts.at(-1)
        const size = part?.type === "text" || part?.type === "reasoning" ? part.text.length : 0
        const status = part?.type === "tool" ? part.state.status : ""
        return `${info.id}:${parts.length}:${part?.id ?? ""}:${size}:${status}`
      })
      .join("|"),
  )

  useEffect(() => {
    setRetry(null)
  }, [props.messages[0]?.sessionID])

  useEffect(() => {
    if (props.status.type === "retry") {
      setRetry(props.status)
      return
    }
    if (props.status.type === "idle") {
      setRetry(null)
    }
  }, [props.status])

  useEffect(() => {
    const node = body.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [props.loading, props.messages.length, props.status.type, retry?.attempt, stamp])

  const note = props.status.type === "retry" ? props.status : retry

  return (
    <div ref={body} className={css.body}>
      <div className={css.list}>
        {props.loading ? (
          <div className={css.load}>
            <LoaderCircle className={common.spin} size={20} />
          </div>
        ) : null}
        {props.messages.map((info) => (
          <Item key={info.id} info={info} onOpenDiff={props.onOpenDiff} />
        ))}
        {props.status.type !== "idle" ? (
          <div className={`${css.status} ${note ? css.statusRetry : ""}`}>
            {note ? <CircleAlert size={14} /> : <LoaderCircle className={common.spin} size={13} />}
            <div className={css.statuscopy}>
              <span>{note ? `正在重试，第 ${note.attempt} 次` : "正在回复"}</span>
              {note?.message ? <span className={css.statusmeta}>{note.message}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
