import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  HelpCircle,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { useWorkbenchModal } from "../../hooks/use-workbench-modal"
import { useWorkbenchQuestion } from "../../hooks/use-workbench-question"
import { Modal } from "../modal"
import ui from "../../../shared/styles/ui.module.css"
import css from "../../styles/side/side.module.css"

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
          {props.open ? (
            <ChevronDown size={14} className={css.groupicon} />
          ) : (
            <ChevronRight size={14} className={css.groupicon} />
          )}
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

export function SessionsTab(props: { open: Record<string, boolean>; onToggle: (key: string) => void }) {
  const modal = useWorkbenchModal()
  const question = useWorkbenchQuestion()

  return (
    <div className={css.stack} style={{ fontSize: 12 }}>
      <Fold
        open={props.open.sessions}
        icon={FolderTree}
        title="策略会话"
        count={modal.sessions.length}
        onToggle={() => props.onToggle("sessions")}
        action={
          <button
            type="button"
            className={css.headbtn}
            onClick={(event) => {
              event.stopPropagation()
              modal.openModal()
            }}
            aria-label="新建会话"
          >
            <Plus size={12} />
          </button>
        }
      >
        <div className={`${css.sessionlist} ${ui.scroll}`}>
          {modal.sessions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${css.session} ${item.id === modal.active ? css.sessionon : ""}`}
              onClick={() => modal.setActive(item.id)}
            >
              <span className={css.name}>{item.title}</span>
              <span className={css.actions}>
                <button
                  type="button"
                  className={css.iconbtn}
                  aria-label="编辑会话"
                  onClick={(event) => {
                    event.stopPropagation()
                    modal.rename(item.id)
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
                    modal.remove(item.id)
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            </button>
          ))}
        </div>
      </Fold>

      <Fold
        open={props.open.issues}
        icon={HelpCircle}
        title="问题清单"
        count={question.questions.length}
        onToggle={() => props.onToggle("issues")}
      >
        <div className={`${css.issuelist} ${ui.scroll}`}>
          {question.questions.length ? (
            question.questions.map((item) => (
              <button key={item.id} type="button" className={css.issue} onClick={() => question.select(item.sessionId)}>
                <div className={css.rowtop}>
                  <span className={css.issuehead}>
                    <MessageCircle size={12} />
                    <span>{item.name || item.sessionId}</span>
                  </span>
                  <button
                    type="button"
                    className={`${css.iconbtn} ${css.danger}`}
                    aria-label="删除问题"
                    onClick={(event) => {
                      event.stopPropagation()
                      question.remove(item)
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p>{item.body}</p>
              </button>
            ))
          ) : (
            <div className={ui.empty}>暂无用户提问</div>
          )}
        </div>
      </Fold>

      <Modal
        open={modal.open}
        busy={modal.busy}
        step={modal.step}
        title={modal.title}
        reqs={modal.reqs}
        rows={modal.rows}
        dims={modal.dims}
        warn={modal.warn}
        err={modal.err}
        data={modal.data}
        onClose={modal.close}
        onStep={modal.setStep}
        onTitle={modal.setTitle}
        onReqs={modal.setReqs}
        onAnalyze={() => void modal.analyze(true)}
        onSubmit={() => void modal.submit()}
      />
    </div>
  )
}
