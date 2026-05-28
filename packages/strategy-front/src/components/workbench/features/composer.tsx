import { ClipboardCheck, Send } from "lucide-react"
import type { KeyboardEvent } from "react"
import css from "./composer.module.css"

export function Composer(props: { draft: string; onDraft: (text: string) => void; onSend: (review: boolean) => void }) {
  const key = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    props.onSend(false)
  }

  return (
    <div className={css.root}>
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
  )
}
