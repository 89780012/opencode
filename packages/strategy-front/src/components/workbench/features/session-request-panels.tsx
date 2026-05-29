import { CheckCircle2, Circle, LoaderCircle, MinusCircle, ShieldAlert } from "lucide-react"
import { useState } from "react"
import type { ChatQuestionAnswer, ChatQuestionRequest, ChatTodo, PermissionRequest } from "@/types/chat"
import common from "./session-common.module.css"
import css from "./session-panels.module.css"

function TodoIcon(props: { status: string }) {
  if (props.status === "completed") return <CheckCircle2 size={14} color="#16a34a" />
  if (props.status === "in_progress") return <LoaderCircle size={14} className={common.spin} color="#2563eb" />
  if (props.status === "cancelled") return <MinusCircle size={14} color="#94a3b8" />
  return <Circle size={14} color="#94a3b8" />
}

export function WorkbenchPermissionPanel(props: {
  req: PermissionRequest
  sending?: boolean
  onReject: () => void
  onAllow: (value: "once" | "always") => void
}) {
  return (
    <div className={css.panel}>
      <div className={css.head}>
        <div>
          <div className={css.title}>
            <ShieldAlert size={15} /> 需要权限
          </div>
          <div className={css.desc}>
            工具 <strong>{props.req.permission}</strong>
            {props.req.patterns.length > 0 ? " 正在申请访问以下范围。" : " 正在申请执行权限。"}
          </div>
        </div>
        <span className={css.pill}>权限</span>
      </div>
      {props.req.patterns.length > 0 ? (
        <div className={css.paths}>
          {props.req.patterns.map((item) => (
            <code key={item} className={css.code}>
              {item}
            </code>
          ))}
        </div>
      ) : null}
      <div className={css.actions}>
        <button type="button" className={`${common.btn} ${common.danger}`} disabled={props.sending} onClick={props.onReject}>
          拒绝
        </button>
        <button type="button" className={common.btn} disabled={props.sending} onClick={() => props.onAllow("always")}>
          始终允许
        </button>
        <button type="button" className={`${common.btn} ${common.primary}`} disabled={props.sending} onClick={() => props.onAllow("once")}>
          仅本次允许
        </button>
      </div>
    </div>
  )
}

export function WorkbenchQuestionPanel(props: {
  req: ChatQuestionRequest
  sending?: boolean
  onReply: (answers: ChatQuestionAnswer[]) => void
  onReject: () => void
}) {
  const [answers, setAnswers] = useState<ChatQuestionAnswer[]>(() => props.req.questions.map(() => []))
  const [texts, setTexts] = useState<string[]>(() => props.req.questions.map(() => ""))

  const pick = (idx: number, label: string, multi: boolean) => {
    setAnswers((list) =>
      list.map((item, i) => {
        if (i !== idx) return item
        if (!multi) return [label]
        return item.includes(label) ? item.filter((value) => value !== label) : [...item, label]
      }),
    )
  }

  const write = (idx: number, value: string, multi: boolean) => {
    setTexts((list) => list.map((item, i) => (i === idx ? value : item)))
    setAnswers((list) =>
      list.map((item, i) => {
        if (i !== idx) return item
        const prev = texts[idx]?.trim()
        const next = item.filter((value) => value !== prev)
        const text = value.trim()
        if (!text) return next
        if (!multi) return [text]
        return next.includes(text) ? next : [...next, text]
      }),
    )
  }

  return (
    <div className={css.panel}>
      <div className={css.head}>
        <div>
          <div className={css.title}>需要确认问题</div>
          <div className={css.desc}>当前任务被问题阻塞，回答后会继续执行。</div>
        </div>
        <span className={css.pill}>{props.req.questions.length} 个问题</span>
      </div>
      <div className={css.stack}>
        {props.req.questions.map((item, idx) => {
          const multi = item.multiple === true
          const chosen = answers[idx] ?? []
          return (
            <div key={`${props.req.id}:${idx}`} className={css.question}>
              <div>
                <div className={css.title}>{item.header}</div>
                <div className={css.desc}>{item.question}</div>
              </div>
              {item.options.map((opt) => {
                const on = chosen.includes(opt.label)
                return (
                  <button
                    key={opt.label}
                    type="button"
                    className={`${css.opt} ${on ? css.opton : ""}`}
                    disabled={props.sending}
                    onClick={() => pick(idx, opt.label, multi)}
                  >
                    <span className={css.mark} />
                    <span className={css.opttext}>
                      <strong>{opt.label}</strong>
                      <span>{opt.description}</span>
                    </span>
                  </button>
                )
              })}
              {item.custom !== false ? (
                <input
                  className={css.input}
                  disabled={props.sending}
                  value={texts[idx] ?? ""}
                  onChange={(event) => write(idx, event.target.value, multi)}
                  placeholder="自定义答案"
                />
              ) : null}
            </div>
          )
        })}
      </div>
      <div className={css.actions}>
        <button type="button" className={common.btn} disabled={props.sending} onClick={props.onReject}>
          取消
        </button>
        <button type="button" className={`${common.btn} ${common.primary}`} disabled={props.sending} onClick={() => props.onReply(answers)}>
          提交答案
        </button>
      </div>
    </div>
  )
}

export function WorkbenchTodoPanel(props: { todos: ChatTodo[]; preview?: string }) {
  if (props.todos.length === 0) return null
  const done = props.todos.filter((item) => item.status === "completed").length
  return (
    <div className={css.panel}>
      <div className={css.head}>
        <div>
          <div className={css.title}>待办</div>
          <div className={css.desc}>{props.preview || "正在跟踪当前任务"}</div>
        </div>
        <span className={css.pill}>
          {done} / {props.todos.length}
        </span>
      </div>
      <div className={css.todos}>
        {props.todos.map((item, idx) => (
          <div key={`${item.content}:${idx}`} className={`${css.todo} ${item.status === "completed" ? css.done : ""}`}>
            <TodoIcon status={item.status} />
            <span>{item.content}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
