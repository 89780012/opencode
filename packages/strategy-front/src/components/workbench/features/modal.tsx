import { AlertTriangle, Check, ChevronRight, LoaderCircle, Plus, RotateCw, Sparkles, Trash2, X } from "lucide-react"
import type { Analyze } from "@/api/modules/workbench"
import css from "../styles/modal/modal.module.css"

export function Modal(props: {
  open: boolean
  busy: boolean
  step: number
  title: string
  reqs: string[]
  rows: { text: string; tags: string[] }[]
  dims: { key: string; label: string; note: string; list: string[]; miss: boolean }[]
  warn: string[]
  err: string
  data: Analyze | null
  onClose: () => void
  onStep: (step: number) => void
  onTitle: (title: string) => void
  onReqs: (reqs: string[]) => void
  onAnalyze: () => void
  onSubmit: () => void
}) {
  if (!props.open) return null

  return (
    <div className={css.overlay}>
      <div
        className={css.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="新建策略会话"
      >
        <div className={css.head}>
          <strong className={css.brand}>
            <Sparkles size={16} />
            <span>新建策略会话</span>
          </strong>
          <button type="button" className={css.icon} onClick={props.onClose} disabled={props.busy}>
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
            <section className={css.panel}>
              <div className={css.panelhead}>
                <div>
                  <h3>策略需求</h3>
                  <p>建议直接描述市场、周期、开平仓、仓位和风控，AI 会在下一步自动拆解。</p>
                </div>
              </div>
              <label className={css.field}>
                <span>原始描述</span>
                <textarea
                  rows={8}
                  // value={props.reqs.join("\n")}
                  onChange={(event) => props.onReqs(event.target.value.split("\n").filter(Boolean))}
                  placeholder="例如：A 股 15 分钟网格策略，保留 20% 底仓，下跌 2% 买入，上涨 2% 卖出，浮亏 10% 清仓。"
                />
              </label>
            </section>
          ) : null}

          {props.step === 2 ? (
            <>
              <section className={css.panel}>
                <div className={css.panelhead}>
                  <div>
                    <h3>分析结果</h3>
                    <p>
                      {props.data
                        ? `AI 已拆解 ${props.reqs.length} 条需求，识别 ${props.dims.filter((item) => !item.miss).length}/${props.dims.length} 个维度。`
                        : "当前还没有可用的分析结果，你可以重试，或直接补充后继续。"}
                    </p>
                  </div>
                  <button type="button" className={css.btn} onClick={props.onAnalyze} disabled={props.busy}>
                    {props.busy ? <LoaderCircle size={14} className={css.spin} /> : <RotateCw size={14} />}
                    <span>{props.busy ? "分析中..." : "重新分析"}</span>
                  </button>
                </div>

                {props.data?.summary ? <div className={css.note}>{props.data.summary}</div> : null}
                {props.err ? (
                  <div className={`${css.alert} ${css.alertwarn}`}>
                    <AlertTriangle size={14} />
                    <span>{props.err}</span>
                  </div>
                ) : null}

                <div className={css.matrix}>
                  {props.dims.map((item) => (
                    <div key={item.key} className={`${css.card} ${item.miss ? css.cardmiss : ""}`}>
                      <strong>{item.label}</strong>
                      <span>{item.list.length ? item.list.join(" / ") : "未识别"}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className={css.panel}>
                <div className={css.panelhead}>
                  <div>
                    <h3>策略标题</h3>
                    <p>你可以在这里微调 AI 生成的标题。</p>
                  </div>
                </div>
                <label className={css.field}>
                  <span>标题</span>
                  <input value={props.title} onChange={(event) => props.onTitle(event.target.value)} />
                </label>
              </section>

              <section className={css.panel}>
                <div className={css.panelhead}>
                  <div>
                    <h3>需求清单</h3>
                    <p>每一项会尽量绑定固定维度标签，便于后续代码生成。</p>
                  </div>
                </div>
                <div className={css.reqbox}>
                  {props.rows.map((item, idx) => (
                    <div key={`req-${idx}`} className={css.reqitem}>
                      <div className={css.reqtop}>
                        <span className={css.idx}>{String(idx + 1).padStart(2, "0")}</span>
                        <button
                          type="button"
                          className={css.del}
                          onClick={() =>
                            props.onReqs(props.reqs.length > 1 ? props.reqs.filter((_, i) => i !== idx) : props.reqs)
                          }
                        >
                          <Trash2 size={14} />
                          <span>删除</span>
                        </button>
                      </div>
                      <input
                        value={item.text}
                        onChange={(event) =>
                          props.onReqs(props.reqs.map((entry, i) => (i === idx ? event.target.value : entry)))
                        }
                      />
                      <div className={css.tags}>
                        {item.tags.length ? (
                          item.tags.map((tag) => (
                            <span key={tag} className={css.tag}>
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className={css.hint}>未匹配到维度标签，建议补充描述后重新分析。</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <button type="button" className={css.add} onClick={() => props.onReqs([...props.reqs, "新增需求"])}>
                    <Plus size={14} />
                    <span>新增需求</span>
                  </button>
                </div>
              </section>
            </>
          ) : null}

          {props.step === 3 ? (
            <section className={css.panel}>
              <div className={css.panelhead}>
                <div>
                  <h3>创建预览</h3>
                  <p>确认后会按当前标题创建会话，需求清单可在后续继续补充。</p>
                </div>
              </div>

              {props.warn.length ? (
                <div className={`${css.alert} ${css.alertrisk}`}>
                  <AlertTriangle size={14} />
                  <span>仍有未识别维度，可能影响代码生成精度，但不会阻止继续创建。</span>
                </div>
              ) : null}

              {props.err ? (
                <div className={`${css.alert} ${css.alertwarn}`}>
                  <AlertTriangle size={14} />
                  <span>{props.err}</span>
                </div>
              ) : null}

              <div className={css.preview}>
                <p>{props.title}</p>
                {props.reqs.map((item, idx) => (
                  <div key={`${idx}-${item}`} className={css.row}>
                    <span>{idx + 1}.</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className={css.foot}>
          {props.step > 1 ? (
            <button
              type="button"
              className={css.btn}
              onClick={() => props.onStep(props.step - 1)}
              disabled={props.busy}
            >
              <ChevronRight size={14} className={css.flip} />
              <span>上一步</span>
            </button>
          ) : (
            <span></span>
          )}
          <button type="button" className={css.primary} onClick={props.onSubmit} disabled={props.busy}>
            {props.step === 3 ? (
              <Check size={14} />
            ) : props.busy ? (
              <LoaderCircle size={14} className={css.spin} />
            ) : (
              <Sparkles size={14} />
            )}
            <span>
              {props.step === 3 ? "确认创建" : props.busy ? "分析中..." : props.step === 1 ? "开始分析" : "继续预览"}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
