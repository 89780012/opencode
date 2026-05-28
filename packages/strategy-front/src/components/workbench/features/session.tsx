import { Bot, ClipboardCheck, FileText, Send, UserRound } from "lucide-react"
import { useEffect, useRef, type KeyboardEvent } from "react"
import type { SessionItem } from "../data"
import css from "./session.module.css"
import ui from "../shared.module.css"

function Bubble(props: { body: string; role: "ai" | "user" }) {
  const Icon = props.role === "ai" ? Bot : UserRound

  return (
    <article className={`${css.bubblewrap} ${props.role === "user" ? css.bubbleuser : css.bubbleai}`}>
      {props.role === "ai" ? (
        <div className={css.avatar}>
          <Icon size={13} strokeWidth={2.2} />
        </div>
      ) : null}
      <div className={css.bubble}>{props.body}</div>
      {props.role === "user" ? (
        <div className={css.avataruser}>
          <Icon size={13} strokeWidth={2.2} />
        </div>
      ) : null}
    </article>
  )
}

export function Session(props: {
  cur: SessionItem
  draft: string
  onDraft: (text: string) => void
  onSend: (review: boolean) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [props.cur.messages])

  const key = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    props.onSend(false)
  }

  return (
    <>
      <section className={css.root}>
        <div className={css.head}>
          <div className={css.req}>
            <FileText size={15} className={css.reqicon} />
            <span>{props.cur.currentRequirement}</span>
          </div>
        </div>

        <div ref={ref} className={`${css.chat} ${ui.scroll}`}>
          {props.cur.messages.map((item, idx) => (
            <Bubble key={`${item.role}-${idx}-${item.body}`} role={item.role} body={item.body} />
          ))}
        </div>
      </section>

      <div className={css.inputbar}>
        <textarea
          rows={2}
          value={props.draft}
          placeholder="输入修改意见，回车发送，Shift + Enter 换行。"
          onChange={(event) => props.onDraft(event.target.value)}
          onKeyDown={key}
        />
        <button type="button" className={css.send} onClick={() => props.onSend(false)} aria-label="发送消息">
          <Send size={15} />
        </button>
        <button type="button" className={css.reviewsend} onClick={() => props.onSend(true)} aria-label="发送并审查">
          <ClipboardCheck size={15} />
        </button>
      </div>
    </>
  )
}
