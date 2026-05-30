import { ClipboardCheck, Send } from "lucide-react"
import { useState, type KeyboardEvent } from "react"
import css from "../../styles/stage/composer.module.css"

export function Composer(props: { onSend: (text: string, review: boolean) => void }) {
  const [draft, setDraft] = useState("")

  const send = (review: boolean) => {
    if (!draft.trim()) return
    props.onSend(draft, review)
    setDraft("")
  }

  const key = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    send(false)
  }

  return (
    <div className={css.root}>
      <textarea
        rows={2}
        value={draft}
        placeholder="输入修改意见，回车发送，Shift + Enter 换行。"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={key}
      />
      <button type="button" className={css.send} onClick={() => send(false)} aria-label="发送消息">
        <Send size={15} />
      </button>
      <button type="button" className={css.reviewsend} onClick={() => send(true)} aria-label="发送并审查">
        <ClipboardCheck size={15} />
      </button>
    </div>
  )
}
