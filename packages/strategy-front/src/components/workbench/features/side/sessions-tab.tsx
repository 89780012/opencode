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
import { useState, type ReactNode } from "react"
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

type SessionAction = { type: "edit"; id: string; title: string } | { type: "delete"; id: string; title: string } | null

function ActionDialog(props: {
  action: SessionAction
  value: string
  locked: boolean
  onValue: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  if (!props.action) return null

  const edit = props.action.type === "edit"
  const title = edit ? "编辑会话名称" : "删除策略会话"
  const desc = edit ? "修改后会立即同步到左侧会话列表。" : "删除后该策略会话将从当前工作区移除，此操作不可撤销。"

  return (
    <div className={css.dialogback} onClick={props.onClose}>
      <div
        className={css.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={css.dialoghead}>
          <strong>{title}</strong>
          <span>{desc}</span>
        </div>
        <div className={css.dialogbody}>
          {edit ? (
            <label className={css.dialogfield}>
              <span>会话名称</span>
              <input value={props.value} onChange={(event) => props.onValue(event.target.value)} autoFocus />
            </label>
          ) : (
            <div className={css.dialogwarn}>
              <Trash2 size={18} />
              <div>
                <strong>{props.action.title}</strong>
                <p>请确认是否删除该会话。</p>
              </div>
            </div>
          )}
        </div>
        <div className={css.dialogfoot}>
          <button type="button" className={css.cancel} onClick={props.onClose}>
            取消
          </button>
          <button
            type="button"
            className={edit ? css.confirm : css.confirmdanger}
            onClick={props.onConfirm}
            disabled={edit ? !props.value.trim() : props.locked}
          >
            {edit ? "保存修改" : props.locked ? "至少保留一个会话" : "确认删除"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SessionsTab(props: { open: Record<string, boolean>; onToggle: (key: string) => void }) {
  const modal = useWorkbenchModal()
  const question = useWorkbenchQuestion()
  const [action, setAction] = useState<SessionAction>(null)
  const [name, setName] = useState("")

  const edit = (id: string, title: string) => {
    setName(title)
    setAction({ type: "edit", id, title })
  }

  const remove = (id: string, title: string) => {
    setAction({ type: "delete", id, title })
  }

  const confirm = () => {
    if (!action) return
    if (action.type === "edit") {
      modal.rename(action.id, name)
      setAction(null)
      return
    }
    modal.remove(action.id)
    setAction(null)
  }

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
            <div key={item.id} className={`${css.session} ${item.id === modal.active ? css.sessionon : ""}`}>
              <button type="button" className={css.sessionmain} onClick={() => modal.setActive(item.id)}>
                <span className={css.name}>{item.title}</span>
              </button>
              <span className={css.actions}>
                <button
                  type="button"
                  className={css.iconbtn}
                  aria-label="编辑会话"
                  title="编辑会话"
                  onClick={() => edit(item.id, item.title)}
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  className={`${css.iconbtn} ${css.danger}`}
                  aria-label="删除会话"
                  title="删除会话"
                  onClick={() => remove(item.id, item.title)}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            </div>
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

      <ActionDialog
        action={action}
        value={name}
        locked={modal.sessions.length === 1}
        onValue={setName}
        onClose={() => setAction(null)}
        onConfirm={confirm}
      />

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
