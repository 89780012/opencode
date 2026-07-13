import { ClipboardCheck, FileWarning, LoaderCircle, X } from "lucide-react"
import ui from "../../../shared/styles/ui.module.css"
import css from "../../styles/stage/requirement-review.module.css"

export function RequirementReview(props: {
  disabled: boolean
  sending: boolean
  onClose: () => void
  onReview: () => void
}) {
  return (
    <div className={css.root}>
      <div className={css.message}>
        <FileWarning size={16} aria-hidden="true" />
        <span>需求已变更，是否重新审查并修改策略代码？</span>
      </div>
      <div className={css.actions}>
        <button
          type="button"
          className={css.review}
          disabled={props.disabled || props.sending}
          onClick={props.onReview}
        >
          {props.sending ? <LoaderCircle size={14} className={ui.spin} /> : <ClipboardCheck size={14} />}
          <span>{props.sending ? "发送中" : "审查并修改"}</span>
        </button>
        <button
          type="button"
          className={css.close}
          disabled={props.sending}
          aria-label="关闭需求变更提示"
          title="关闭提示"
          onClick={props.onClose}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
