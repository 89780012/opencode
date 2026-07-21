import { FolderTree, HelpCircle, MessageCircle, Pencil, Plus, Trash2, type LucideIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useSystem } from "@/components/system/system-provider"
import { useWorkbenchModal } from "../../hooks/use-workbench-modal"
import { type WorkbenchQuestion, useWorkbenchQuestion } from "../../hooks/use-workbench-question"
import { Compact } from "../../layout/compact"
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
  return (
    <Compact open={props.open} icon={props.icon} title={props.title} meta={props.count} action={props.action} onToggle={props.onToggle}>
      {props.children}
    </Compact>
  )
}

type SessionAction = { type: "edit"; id: string; title: string } | { type: "delete"; id: string; title: string } | null

function SessionDialog(props: {
  session: SessionAction
  value: string
  onValue: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  if (!props.session) return null

  const edit = props.session.type === "edit"
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
                <strong>{props.session.title}</strong>
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
            disabled={edit && !props.value.trim()}
          >
            {edit ? "保存修改" : "确认删除"}
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestionDialog(props: { item: WorkbenchQuestion | null; onClose: () => void; onConfirm: () => void }) {
  if (!props.item) return null

  return (
    <div className={css.dialogback} onClick={props.onClose}>
      <div
        className={css.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="删除问题记录"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={css.dialoghead}>
          <strong>删除问题记录</strong>
          <span>删除后该问题将从问题清单中移除，不会影响原会话内容。</span>
        </div>
        <div className={css.dialogbody}>
          <div className={css.dialogwarn}>
            <Trash2 size={18} />
            <div>
              <strong>{props.item.body}</strong>
              <p>{`来源：${props.item.name || props.item.sessionId}`}</p>
            </div>
          </div>
        </div>
        <div className={css.dialogfoot}>
          <button type="button" className={css.cancel} onClick={props.onClose}>
            取消
          </button>
          <button type="button" className={css.confirmdanger} onClick={props.onConfirm}>
            确认删除
          </button>
        </div>
      </div>
    </div>
  )
}

export function SessionsTab(props: { open: Record<string, boolean>; onToggle: (key: string) => void }) {
  const modal = useWorkbenchModal()
  const sys = useSystem()
  const questions = useWorkbenchQuestion()
  const [session, setSession] = useState<SessionAction>(null)
  const [question, setQuestion] = useState<WorkbenchQuestion | null>(null)
  const [name, setName] = useState("")

  const edit = (id: string, title: string) => {
    setName(title)
    setSession({ type: "edit", id, title })
  }

  const remove = (id: string, title: string) => {
    setSession({ type: "delete", id, title })
  }

  const confirm = () => {
    if (!session) return
    if (session.type === "edit") {
      modal.rename(session.id, name)
      setSession(null)
      return
    }
    modal.remove(session.id)
    setSession(null)
  }

  const drop = () => {
    if (!question) return
    questions.remove(question)
    setQuestion(null)
  }

  return (
    <div className={css.stack}>
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
            disabled={sys.load || modal.creating}
            onClick={(event) => {
              event.stopPropagation()
              if (sys.cfg.workbench.intake) {
                modal.quick()
                return
              }
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
        count={questions.questions.length}
        onToggle={() => props.onToggle("issues")}
      >
        <div className={`${css.issuelist} ${ui.scroll}`}>
          {questions.questions.length ? (
            questions.questions.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={css.issue}
                onClick={() => questions.select(item.sessionId)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return
                  event.preventDefault()
                  questions.select(item.sessionId)
                }}
              >
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
                      setQuestion(item)
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p>{item.body}</p>
              </div>
            ))
          ) : (
            <div className={ui.empty}>暂无用户提问</div>
          )}
        </div>
      </Fold>

      <SessionDialog
        session={session}
        value={name}
        onValue={setName}
        onClose={() => setSession(null)}
        onConfirm={confirm}
      />

      <QuestionDialog item={question} onClose={() => setQuestion(null)} onConfirm={drop} />

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
