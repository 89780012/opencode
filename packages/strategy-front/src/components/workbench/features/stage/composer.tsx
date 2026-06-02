import { ClipboardCheck, Send, Square } from "lucide-react"
import type { KeyboardEvent } from "react"
import css from "../../styles/stage/composer.module.css"

export function Composer(props: {
  value: string
  busy?: boolean
  disabled?: boolean
  submitting?: boolean
  review?: boolean
  placeholder?: string
  mode?: "narrow" | "full"
  onAbort?: () => void
  onChange: (value: string) => void
  onSend: (text: string, review: boolean) => void
}) {
  const send = (review: boolean) => {
    if (!props.value.trim()) return
    props.onSend(props.value, review)
  }

  const key = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    if (props.busy) {
      props.onAbort?.()
      return
    }
    send(false)
  }

  const label = props.busy ? "停止" : props.submitting ? "发送中" : "发送"
  const locked = props.disabled || props.submitting || props.busy

  return (
    <div className={css.root}>
      <div className={`${css.box} ${props.mode === "full" ? css.full : ""}`}>
        <textarea
          rows={2}
          className={css.input}
          disabled={props.disabled}
          value={props.value}
          placeholder={"输入策略想法、回测目标，或需要我协助的问题..."}
          onChange={(event) => props.onChange(event.target.value)}
          onKeyDown={key}
        />
        <div className={css.controls}>
          {props.busy ? (
            <button
              type="button"
              className={`${css.action} ${css.stop}`}
              aria-label="停止"
              title="停止"
              onClick={props.onAbort}
            >
              <Square size={13} />
            </button>
          ) : null}
          <button
            type="button"
            className={`${css.action} ${css.send}`}
            onClick={() => send(false)}
            aria-label={label}
            title={label}
            disabled={locked || !props.value.trim()}
          >
            <Send size={15} />
          </button>
          <button
            type="button"
            className={`${css.action} ${css.reviewsend}`}
            onClick={() => send(true)}
            aria-label="发送并审查"
            title="发送并审查"
            disabled={locked || !props.value.trim()}
          >
            <ClipboardCheck size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
