import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Copy,
  Download,
  FileCode2,
  LoaderCircle,
} from "lucide-react"
import { memo, useEffect, useMemo, useState, type ReactNode } from "react"
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation"
import { Response } from "@/components/ai-elements/response"
import { backtestTool, partition } from "@/lib/backtest-tool"
import { selectSessionParts, useAppSelector } from "@/store"
import type { ChatAssistantMessage, ChatMessageInfo, ChatPart, ChatStatus, ChatToolPart } from "@/types/chat"
import common from "../../styles/session/session-common.module.css"
import css from "../../styles/session/session-chat.module.css"
import { SessionBacktestTool } from "./session-backtest-tool"

const empty: ChatPart[] = []
const ansi = /\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g
type Retry = Extract<ChatStatus, { type: "retry" }>
type Entry =
  | {
      type: "item"
      info: ChatMessageInfo
    }
  | {
      type: "group"
      parent: string
      infos: ChatAssistantMessage[]
    }
type Block =
  | {
      type: "part"
      part: ChatPart
    }
  | {
      type: "proc"
      key: string
      parts: ChatPart[]
    }

type Data = {
  info: ChatAssistantMessage
  parts: ChatPart[]
}

function same(a: Data[], b: Data[]) {
  if (a.length !== b.length) return false
  return a.every((item, idx) => item.info === b[idx]?.info && item.parts === b[idx]?.parts)
}

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
    part.type === "agent" ||
    part.type === "step-start" ||
    part.type === "step-finish"
  )
}

function shown(part: ChatPart) {
  return part.type !== "step-start" && part.type !== "step-finish"
}

function entries(messages: ChatMessageInfo[]) {
  return messages.reduce<Entry[]>((list, info) => {
    if (info.role !== "assistant") return list.concat({ type: "item", info })
    const last = list.at(-1)
    if (last?.type === "group" && last.parent === info.parentID) {
      last.infos.push(info)
      return list
    }
    return list.concat({ type: "group", parent: info.parentID, infos: [info] })
  }, [])
}

function blocks(parts: ChatPart[], role: ChatMessageInfo["role"]) {
  const body = parts.filter(shown)
  if (role !== "assistant") return body.map((part): Block => ({ type: "part", part }))
  const done = body.reduce<{ list: Block[]; logs: ChatPart[] }>(
    (state, part) => {
      if (internal(part)) {
        return {
          list: state.list,
          logs: state.logs.concat(part),
        }
      }
      const list =
        state.logs.length === 0
          ? state.list
          : state.list.concat({
              type: "proc",
              key: state.logs[0]?.id ?? "",
              parts: state.logs,
            })
      return {
        list: list.concat({ type: "part", part }),
        logs: [],
      }
    },
    { list: [], logs: [] },
  )
  if (done.logs.length === 0) return done.list
  return done.list.concat({
    type: "proc",
    key: done.logs[0]?.id ?? "",
    parts: done.logs,
  })
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
  state?: "running" | "done" | "warn" | "error"
}) {
  const [open, setOpen] = useState(false)
  const state = props.state ?? "done"

  return (
    <div className={`${css.fold} ${css[`fold_${state}`]} ${props.line === false ? css.foldPlain : ""}`}>
      <button type="button" className={css.foldhead} onClick={() => setOpen((value) => !value)}>
        <span className={css.foldtitle}>
          {state === "running" ? (
            <LoaderCircle size={15} strokeWidth={2.3} className={common.spin} />
          ) : state === "warn" || state === "error" ? (
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

function json(value: unknown) {
  if (value === undefined) return ""
  return JSON.stringify(value, null, 2) ?? ""
}

function payload(part: ChatToolPart) {
  const cmd = text(part.state.input.command)
  if (cmd && Object.keys(part.state.input).length === 1) {
    return {
      lang: "shell",
      value: `$ ${cmd}`,
    }
  }
  return {
    lang: "json",
    value: json(part.state.input),
  }
}

function ext(lang: string) {
  const key = lang.toLowerCase()
  if (key === "shell" || key === "bash" || key === "sh") return "sh"
  if (key === "javascript" || key === "js") return "js"
  if (key === "typescript" || key === "ts") return "ts"
  if (key === "json") return "json"
  if (key === "markdown" || key === "md") return "md"
  if (key === "html") return "html"
  if (key === "css") return "css"
  return "txt"
}

function Panel(props: { title: string; children: ReactNode }) {
  return (
    <section className={css.toolpanel}>
      <div className={css.toollabel}>{props.title}</div>
      {props.children}
    </section>
  )
}

function DefaultTool(props: { part: ChatToolPart }) {
  const out = output(props.part)
  const body = payload(props.part)
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
  const label =
    state === "running"
      ? `正在调用 ${props.part.tool}`
      : state === "error"
        ? `${props.part.tool} 调用失败`
        : `已调用 ${props.part.tool}`
  const data = "metadata" in props.part.state ? props.part.state.metadata : undefined
  const sid = data && typeof data.sessionId === "string" ? data.sessionId : ""
  const used = "time" in props.part.state ? time(props.part.state.time) : ""

  return (
    <Fold title={label} line={false} meta={title !== props.part.tool ? title : undefined} state={state}>
      <div className={css.toolbody}>
        <div className={css.toolmeta}>
          <span>
            <b>工具</b>
            {props.part.tool}
          </span>
          <span>
            <b>状态</b>
            {props.part.state.status}
          </span>
          {used ? (
            <span>
              <b>耗时</b>
              {used.replace("用时 ", "")}
            </span>
          ) : null}
          {sid ? (
            <span>
              <b>子任务</b>
              {sid}
            </span>
          ) : null}
          <span>
            <b>调用</b>
            {props.part.callID}
          </span>
        </div>
        <Panel title="输入">
          {body.value ? <CodeBlock lang={body.lang} value={body.value} /> : <div className={css.muted}>暂无输入</div>}
        </Panel>
        <Panel title={props.part.state.status === "error" ? "错误" : "输出"}>
          {out ? <CodeBlock lang="text" value={out} /> : <div className={css.muted}>暂无输出</div>}
        </Panel>
      </div>
    </Fold>
  )
}

function Tool(props: { part: ChatToolPart }) {
  const data = backtestTool(props.part)
  const fallback = <DefaultTool part={props.part} />
  if (!data) return fallback
  return <SessionBacktestTool data={data} fallback={fallback} />
}

function CodeBlock(props: { lang: string; value: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => {
      setCopied(false)
    }, 1600)
    return () => {
      window.clearTimeout(timer)
    }
  }, [copied])

  const copy = () => {
    void navigator.clipboard.writeText(props.value).then(
      () => {
        setCopied(true)
      },
      () => {},
    )
  }

  const save = () => {
    const url = URL.createObjectURL(new Blob([props.value], { type: "text/plain;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `code.${ext(props.lang)}`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={css.codebox}>
      <div className={css.codehead}>
        <span>{props.lang}</span>
        <span className={css.codeactions}>
          <button type="button" className={css.codeaction} aria-label="下载代码块" title="下载" onClick={save}>
            <Download size={13} />
          </button>
          <button
            type="button"
            className={css.codeaction}
            aria-label="复制代码块"
            title={copied ? "已复制" : "复制"}
            onClick={copy}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
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
  const body = parts.filter(shown)
  if (
    body.some(
      (part) =>
        (part.type === "tool" && (part.state.status === "running" || part.state.status === "pending")) ||
        (part.type === "reasoning" && !part.time.end),
    )
  ) {
    return "running"
  }
  if (body.some((part) => (part.type === "tool" && part.state.status === "error") || part.type === "retry"))
    return "warn"
  return "done"
}

function meta(parts: ChatPart[]) {
  const body = parts.filter(shown)
  const tools = body.filter((part): part is ChatToolPart => part.type === "tool").length
  const fail = body.filter(
    (part) => (part.type === "tool" && part.state.status === "error") || part.type === "retry",
  ).length
  if (!tools) return `${body.length} 步`
  return `${body.length} 步 · ${tools} 个工具${fail ? ` · ${fail} 个失败` : ""}`
}

function Process(props: { parts: ChatPart[]; onOpenDiff?: (file: string) => void }) {
  const parts = props.parts.filter(shown)
  if (parts.length === 0) return null
  const { cards, rest } = partition(parts)

  return (
    <div className={css.process}>
      {cards.map((part) => (
        <Tool key={part.id} part={part} />
      ))}
      {rest.length ? (
        <Fold title="执行过程" meta={meta(rest)} state={proc(rest)}>
          <div className={css.processBody}>
            {rest.map((part) => (
              <Part key={part.id} part={part} role="assistant" onOpenDiff={props.onOpenDiff} />
            ))}
          </div>
        </Fold>
      ) : null}
    </div>
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
  const synthetic = body.length > 0 && body.every((part: ChatPart) => part.type === "text" && part.synthetic)
  const fromUser = user && !synthetic
  const list = useMemo(() => blocks(body, props.info.role), [body, props.info.role])
  const trace = !user && list.length === 1 && list[0]?.type === "proc"

  if (list.length === 0 && !msg) return null

  if (body.length === 1 && body[0]?.type === "compaction") {
    const part = body[0]
    return (
      <div className={css.compaction}>
        <span>上下文已压缩{part.overflow ? "，原因是上下文溢出" : ""}</span>
      </div>
    )
  }

  return (
    <article className={`${css.msg} ${fromUser ? css.user : css.ai} ${trace ? css.trace : ""}`}>
      <div className={css.avatar}>{fromUser ? "我" : <Bot size={14} />}</div>
      <div className={css.card}>
        {list.map((item) =>
          item.type === "proc" ? (
            <Process key={item.key} parts={item.parts} onOpenDiff={props.onOpenDiff} />
          ) : (
            <Part key={item.part.id} part={item.part} role={props.info.role} onOpenDiff={props.onOpenDiff} />
          ),
        )}
        {msg ? (
          <Fold title="回复失败" state="error">
            <div className={css.warn}>{msg}</div>
          </Fold>
        ) : null}
      </div>
    </article>
  )
})

const Group = memo(function Group(props: { infos: ChatAssistantMessage[]; onOpenDiff?: (file: string) => void }) {
  const data = useAppSelector(
    (state) =>
      props.infos.map((info) => ({
        info,
        parts: selectSessionParts(state, info.id),
      })),
    same,
  )
  const body = useMemo(() => data.flatMap((item) => item.parts), [data])
  const list = useMemo(() => blocks(body, "assistant"), [body])
  const msg = useMemo(
    () =>
      data
        .map((item) => err(item.info))
        .filter((item) => item)
        .at(-1),
    [data],
  )

  if (list.length === 0 && !msg) return null

  return (
    <article className={`${css.msg} ${css.ai} ${css.group}`}>
      <div className={css.avatar}>
        <Bot size={14} />
      </div>
      <div className={css.card}>
        {list.map((item) =>
          item.type === "proc" ? (
            <Process key={item.key} parts={item.parts} onOpenDiff={props.onOpenDiff} />
          ) : (
            <Part key={item.part.id} part={item.part} role="assistant" onOpenDiff={props.onOpenDiff} />
          ),
        )}
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
  mode: "narrow" | "full"
  status: ChatStatus
  onOpenDiff?: (file: string) => void
}) {
  const [retry, setRetry] = useState<Retry | null>(null)

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

  const note = props.status.type === "retry" ? props.status : retry
  const list = useMemo(() => entries(props.messages), [props.messages])

  return (
    <Conversation className={css.body} autoScroll={false}>
      <ConversationContent plain className={`${css.list} ${props.mode === "full" ? css.listFull : ""}`}>
        {props.loading ? (
          <div className={css.load}>
            <LoaderCircle className={common.spin} size={20} />
          </div>
        ) : null}
        {list.map((item) =>
          item.type === "group" ? (
            <Group key={`${item.parent}:${item.infos[0]?.id ?? ""}`} infos={item.infos} onOpenDiff={props.onOpenDiff} />
          ) : (
            <Item key={item.info.id} info={item.info} onOpenDiff={props.onOpenDiff} />
          ),
        )}
        {props.status.type !== "idle" ? (
          <div className={`${css.status} ${note ? css.statusRetry : ""}`}>
            {note ? <CircleAlert size={14} /> : <LoaderCircle className={common.spin} size={13} />}
            <div className={css.statuscopy}>
              <span>{note ? `正在重试，第 ${note.attempt} 次` : "正在回复"}</span>
              {note?.message ? <span className={css.statusmeta}>{note.message}</span> : null}
            </div>
          </div>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}
