import { Check, ChevronRight, LoaderCircle, Plus, Sparkles, Trash2, X } from "lucide-react"
import ui from "../../shared/styles/ui.module.css"
import css from "../styles/modal/modal.module.css"

export function Modal(props: {
  open: boolean
  busy: boolean
  step: number
  title: string
  reqs: string[]
  onClose: () => void
  onStep: (step: number) => void
  onTitle: (title: string) => void
  onReqs: (reqs: string[]) => void
  onSubmit: () => void
}) {
  if (!props.open) return null

  return (
    <div className={css.overlay} onClick={() => !props.busy && props.onClose()}>
      <div className={css.modal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="新建会话">
        <div className={css.head}>
          <strong className={ui.sectiontitle}>
            <Sparkles size={16} />
            <span>新建策略会话</span>
          </strong>
          <button type="button" onClick={props.onClose}>
            <X size={15} />
            <span>关闭</span>
          </button>
        </div>

        <div className={css.steps}>
          {[1, 2, 3].map((item) => (
            <div key={item} className={css.step}>
              <span className={`${css.num} ${item <= props.step ? css.numon : ""}`}>{item}</span>
              <em>{item === 1 ? "输入需求" : item === 2 ? "AI 分析" : "预览确认"}</em>
            </div>
          ))}
        </div>

        <div className={css.body}>
          {props.step === 1 ? (
            <>
              <label>请描述你的策略需求</label>
              <textarea rows={5} value={props.reqs.join("\n")} onChange={(event) => props.onReqs(event.target.value.split("\n").filter(Boolean))} />
            </>
          ) : null}

          {props.step === 2 ? (
            <>
              <label>策略标题</label>
              <input value={props.title} onChange={(event) => props.onTitle(event.target.value)} />
              <label>需求清单</label>
              <div className={css.reqbox}>
                {props.reqs.map((item, idx) => (
                  <div key={`${idx}-${item}`} className={css.reqrow}>
                    <input value={item} onChange={(event) => props.onReqs(props.reqs.map((entry, i) => (i === idx ? event.target.value : entry)))} />
                    <button type="button" onClick={() => props.onReqs(props.reqs.length > 1 ? props.reqs.filter((_, i) => i !== idx) : props.reqs)}>
                      <Trash2 size={14} />
                      <span>删除</span>
                    </button>
                  </div>
                ))}
                <button type="button" className={ui.ghost} onClick={() => props.onReqs([...props.reqs, "新增需求"])}>
                  <Plus size={14} />
                  <span>新增需求</span>
                </button>
              </div>
            </>
          ) : null}

          {props.step === 3 ? (
            <div className={css.preview}>
              <p>{props.title}</p>
              {props.reqs.map((item, idx) => (
                <div key={`${idx}-${item}`} className={css.row}>
                  <span>{idx + 1}.</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={css.foot}>
          {props.step > 1 ? (
            <button type="button" className={ui.blockbtn} onClick={() => props.onStep(props.step - 1)}>
              <ChevronRight size={14} className={ui.flip} />
              <span>上一步</span>
            </button>
          ) : (
            <span></span>
          )}
          <button type="button" className={ui.primary} onClick={props.onSubmit}>
            {props.step === 3 ? <Check size={14} /> : props.busy ? <LoaderCircle size={14} className={ui.spin} /> : <Sparkles size={14} />}
            <span>{props.step === 3 ? "确认创建" : props.busy ? "分析中..." : "下一步"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
