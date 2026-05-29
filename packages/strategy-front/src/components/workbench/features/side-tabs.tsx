import {
  ChartColumn,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  ClipboardCheck,
  Code2,
  FileCheck,
  FileText,
  FolderTree,
  HelpCircle,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  Workflow,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { type SessionItem, type Stage } from "../data"
import { Compact } from "../layout/compact"
import ui from "../../workstation/shared.module.css"
import css from "./side.module.css"

export type Issue = { sid: string; name: string; body: string }

const steps = [
  { key: "requirement", label: "需求确认", icon: FileCheck },
  { key: "code", label: "代码编写", icon: Code2 },
  { key: "review", label: "代码审查", icon: ClipboardCheck },
  { key: "flowchart", label: "流程图生成", icon: Workflow },
  { key: "backtest", label: "回测验证", icon: ChartColumn },
] as const

function state(cur: SessionItem, key: (typeof steps)[number]["key"]) {
  if (key === "requirement") return "done"
  if (key === "code") return "done"
  if (key === "review") {
    if (cur.reviewStatus === "running") return "running"
    if (cur.reviewStatus === "passed" || cur.reviewStatus === "failed") return "done"
    return "pending"
  }
  if (key === "flowchart") {
    if (cur.flowchartStatus === "generating") return "running"
    if (cur.flowchartStatus === "done") return "done"
    return "pending"
  }
  if (cur.backtestStatus === "running") return "running"
  if (cur.backtestStatus === "done") return "done"
  return "pending"
}

function Fold(props: {
  open: boolean
  icon: LucideIcon
  title: string
  count: number
  onToggle: () => void
  action?: ReactNode
  children: ReactNode
}) {
  const Icon = props.icon

  return (
    <section className={`${css.group} ${props.open ? css.groupopen : css.groupshut}`}>
      <button type="button" className={css.grouphead} onClick={props.onToggle}>
        <span className={css.groupleft}>
          {props.open ? <ChevronDown size={14} className={css.groupicon} /> : <ChevronRight size={14} className={css.groupicon} />}
          <Icon size={14} className={css.groupicon} />
          <span>{props.title}</span>
        </span>
        <span className={css.groupright}>
          <span className={css.groupmeta}>{props.count}</span>
          {props.action ? <span className={css.groupaction}>{props.action}</span> : null}
        </span>
      </button>
      {props.open ? <div className={css.groupbody}>{props.children}</div> : null}
    </section>
  )
}

export function SessionsTab(props: {
  cur: SessionItem
  sessions: SessionItem[]
  issues: Issue[]
  onToggle: (key: string) => void
  onPick: (id: string) => void
  onModal: () => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className={css.stack} style={{ fontSize: 12 }}>
      <Fold
        open={props.cur.sections.sessions}
        icon={FolderTree}
        title="策略会话"
        count={props.sessions.length}
        onToggle={() => props.onToggle("sessions")}
        action={
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
        }
      >
        <div className={`${css.sessionlist} ${ui.scroll}`}>
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
      </Fold>

      <Fold open={props.cur.sections.issues} icon={HelpCircle} title="问题清单" count={props.issues.length} onToggle={() => props.onToggle("issues")}>
        <div className={`${css.issuelist} ${ui.scroll}`}>
          {props.issues.length ? (
            props.issues.map((item) => (
              <button key={`${item.sid}-${item.body}`} type="button" className={css.issue} onClick={() => props.onPick(item.sid)}>
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
      </Fold>
    </div>
  )
}

function Progress(props: { cur: SessionItem }) {
  return (
    <div className={css.stepbox}>
      {steps.map((item) => {
        const Icon = item.icon
        const tone = state(props.cur, item.key)
        return (
          <div key={item.key} className={`${css.step} ${css[`step_${tone}`]}`}>
            <div className={css.progress}>
              <span className={`${css.stepicon} ${css[`stepicon_${tone}`]}`}>
                {tone === "done" ? <CheckCircle2 size={14} /> : tone === "running" ? <LoaderCircle size={14} className={ui.spin} /> : <Icon size={14} />}
              </span>
              <strong>{item.label}</strong>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function RequirementsTab(props: {
  cur: SessionItem
  risk: string
  hint: string
  onToggle: (key: string) => void
  onStage: (stage: Stage) => void
  onBacktest: (idx: number) => void
}) {
  return (
    <div className={css.stack}>
      <Compact open={props.cur.sections.requirements} icon={FileText} title="需求理解" onToggle={() => props.onToggle("requirements")}>
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
          <p className={css.logic}>需求：{props.cur.currentRequirement}</p>
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
        <Progress cur={props.cur} />
      </Compact>

      <Compact open={props.cur.sections.backtest} icon={ChartColumn} title="回测记录" onToggle={() => props.onToggle("backtest")}>
        <div className={`${css.logbox} ${ui.scroll}`}>
          {props.cur.backtestHistory.length ? (
            props.cur.backtestHistory.map((item, idx) => (
              <button key={`${item.time}-${idx}`} type="button" className={css.log} onClick={() => props.onBacktest(idx)}>
                <div className={css.rowtop}>
                  <span className={css.logtitle}>回测 #{props.cur.backtestHistory.length - idx}</span>
                  <span>{item.time}</span>
                </div>
                <p className={css.logic}>
                  收益: {item.results.totalReturn} · 夏普: {item.results.sharpe}
                </p>
              </button>
            ))
          ) : (
            <div className={ui.empty}>暂无回测记录</div>
          )}
        </div>
      </Compact>
    </div>
  )
}
