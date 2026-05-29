import { Send, Square } from "lucide-react"
import type { KeyboardEvent } from "react"
import css from "../../styles/session/session-composer.module.css"

export function SessionComposer(props: {
  busy: boolean
  disabled?: boolean
  submitting?: boolean
  value: string
  onAbort: () => void
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  const key = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    if (props.busy) {
      props.onAbort()
      return
    }
    props.onSubmit()
  }

  const label = props.busy ? "停止" : props.submitting ? "发送中" : "发送"
  const locked = props.disabled || props.submitting || props.busy

  return (
    <div className={css.root}>
      <div className={css.box}>
        <textarea
          style={{ outline: 0 }}
          className={css.input}
          disabled={props.disabled}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          onKeyDown={key}
          placeholder="输入策略想法、回测目标，或需要我协助的问题..."
        />
        <div className={css.controls}>
          {props.busy ? (
            <button
              type="button"
              className={`${css.action} ${css.stop}`}
              aria-label="打断"
              title="打断"
              onClick={props.onAbort}
            >
              <Square size={13} />
            </button>
          ) : null}
          <button
            type="button"
            className={`${css.action} ${css.submit}`}
            aria-label={label}
            title={label}
            disabled={locked || !props.value.trim()}
            onClick={props.onSubmit}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
