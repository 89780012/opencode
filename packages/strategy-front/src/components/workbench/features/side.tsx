import {
  ChartColumn,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  ClipboardList,
  FileText,
  FolderTree,
  HelpCircle,
  MessageCircle,
  MessageSquareMore,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react"
import { prog, type SessionItem, type SidebarTab, type Stage } from "../data"
import ui from "../shared.module.css"
import { Compact } from "../layout/compact"
import css from "./side.module.css"

export function Side(props: {
  tab: SidebarTab
  cur: SessionItem
  sessions: SessionItem[]
  issues: Array<{ sid: string; name: string; body: string }>
  risk: string
  hint: string
  onTab: (tab: SidebarTab) => void
  onToggle: (key: string) => void
  onPick: (id: string) => void
  onModal: () => void
  onStage: (stage: Stage) => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <aside className={css.root}>
      <div className={css.logo}>
        <Sparkles size={15} />
        <span>OpenCode</span>
      </div>

      <div className={css.tabs}>
        <button
          type="button"
          className={props.tab === "requirements" ? css.tabon : ""}
          onClick={() => props.onTab("requirements")}
        >
          <ClipboardList size={14} />
          <span>需求面板</span>
        </button>
        <button
          type="button"
          className={props.tab === "sessions" ? css.tabon : ""}
          onClick={() => props.onTab("sessions")}
        >
          <MessageSquareMore size={14} />
          <span>会话列表</span>
        </button>
      </div>

      {props.tab === "sessions" ? (
        <div className={css.stack}>
          <section className={`${css.group} ${props.cur.sections.sessions ? css.groupopen : css.groupshut}`}>
            <button type="button" className={css.grouphead} onClick={() => props.onToggle("sessions")}>
              <span className={css.groupleft}>
                {props.cur.sections.sessions ? (
                  <ChevronDown size={14} className={css.groupicon} />
                ) : (
                  <ChevronRight size={14} className={css.groupicon} />
                )}
                <FolderTree size={14} className={css.groupicon} />
                <span>策略会话</span>
              </span>
              <span className={css.groupright}>
                <span className={css.groupmeta}>{props.sessions.length}</span>
                <span className={css.groupaction}>
                  <button
                    type="button"
                    className={css.headbtn}
                    onClick={(event) => {
                      event.stopPropagation()
                      props.onModal()
                    }}
                    aria-label="新建会话"
                  >
                    <Plus size={12} />
                  </button>
                </span>
              </span>
            </button>
            {props.cur.sections.sessions ? (
              <div className={css.groupbody}>
                <div className={css.sessionlist}>
                  {props.sessions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${css.session} ${item.id === props.cur.id ? css.sessionon : ""}`}
                      onClick={() => props.onPick(item.id)}
                    >
                      <span className={css.name}>{item.name}</span>
                      <span className={css.actions}>
                        <button
                          type="button"
                          className={css.iconbtn}
                          aria-label="编辑会话"
                          onClick={(event) => {
                            event.stopPropagation()
                            props.onRename(item.id)
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          className={`${css.iconbtn} ${css.danger}`}
                          aria-label="删除会话"
                          onClick={(event) => {
                            event.stopPropagation()
                            props.onDelete(item.id)
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className={`${css.group} ${props.cur.sections.issues ? css.groupopen : css.groupshut}`}>
            <button type="button" className={css.grouphead} onClick={() => props.onToggle("issues")}>
              <span className={css.groupleft}>
                {props.cur.sections.issues ? (
                  <ChevronDown size={14} className={css.groupicon} />
                ) : (
                  <ChevronRight size={14} className={css.groupicon} />
                )}
                <HelpCircle size={14} className={css.groupicon} />
                <span>问题清单</span>
              </span>
              <span className={css.groupright}>
                <span className={css.groupmeta}>{props.issues.length}</span>
              </span>
            </button>
            {props.cur.sections.issues ? (
              <div className={css.groupbody}>
                <div className={css.issuelist}>
                  {props.issues.length ? (
                    props.issues.map((item) => (
                      <button
                        key={`${item.sid}-${item.body}`}
                        type="button"
                        className={css.issue}
                        onClick={() => props.onPick(item.sid)}
                      >
                        <div className={css.rowtop}>
                          <span className={css.issuehead}>
                            <MessageCircle size={12} />
                            <span>{item.name}</span>
                          </span>
                        </div>
                        <p>{item.body}</p>
                      </button>
                    ))
                  ) : (
                    <div className={ui.empty}>暂无用户提问</div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        <div className={css.stack}>
          <Compact
            open={props.cur.sections.requirements}
            icon={FileText}
            title="需求理解"
            onToggle={() => props.onToggle("requirements")}
          >
            <div className={css.reqbox}>
              {props.cur.analyzedRequirements.map((item, idx) => (
                <div key={item} className={css.reqrow}>
                  <span>{idx + 1}.</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </Compact>

          <Compact
            open={props.cur.sections.logic}
            icon={Workflow}
            title="策略逻辑蓝图"
            onToggle={() => props.onToggle("logic")}
            action={
              <button type="button" className={css.tag} onClick={() => props.onStage("flowchart")}>
                <Workflow size={12} />
                <span>流程图</span>
              </button>
            }
          >
            <div className={css.logicbox}>
              <p className={css.warn}>
                <CircleAlert size={14} />
                <span>{props.risk}</span>
              </p>
              <p className={css.logic}>{props.hint}</p>
              <p className={css.mini}>需求：{props.cur.currentRequirement}</p>
            </div>
          </Compact>

          <Compact
            open={props.cur.sections.progress}
            icon={Clock3}
            title="进度追踪"
            onToggle={() => props.onToggle("progress")}
            action={
              <button type="button" className={css.tag} onClick={() => props.onStage("timeline")}>
                <Clock3 size={12} />
                <span>时间线</span>
              </button>
            }
          >
            <div className={css.stepbox}>
              {prog.map((item) => (
                <div key={item.label} className={css.step}>
                  <div className={css.progress}>
                    <span className={`${css.dot} ${css[`dot_${item.tone}`]}`}></span>
                    <strong>{item.label}</strong>
                  </div>
                  <span className={css.note}>{item.note}</span>
                </div>
              ))}
            </div>
          </Compact>

          <Compact
            open={props.cur.sections.backtest}
            icon={ChartColumn}
            title="回测记录"
            onToggle={() => props.onToggle("backtest")}
          >
            <div className={css.logbox}>
              {props.cur.backtestHistory.length ? (
                props.cur.backtestHistory.map((item, idx) => (
                  <button
                    key={`${item.time}-${idx}`}
                    type="button"
                    className={css.log}
                    onClick={() => props.onStage("backtest")}
                  >
                    <div className={css.rowtop}>
                      <span>{item.time}</span>
                      <span>记录</span>
                    </div>
                    <p>
                      收益 {item.results.totalReturn} / 夏普 {item.results.sharpe}
                    </p>
                  </button>
                ))
              ) : (
                <div className={ui.empty}>暂无回测记录</div>
              )}
            </div>
          </Compact>
        </div>
      )}
    </aside>
  )
}
