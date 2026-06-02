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
import type { SessionItem } from "../../data"
import { useWorkbenchSession } from "../../hooks/use-workbench-session"
import { Modal } from "../modal"
import ui from "../../../shared/styles/ui.module.css"
import css from "../../styles/side/side.module.css"

export type Issue = { sid: string; name: string; body: string }

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

export function SessionsTab(props: {
  cur: SessionItem
  issues: Issue[]
  onToggle: (key: string) => void
  onIssuePick: (id: string) => void
  onCreate?: () => void
}) {
  const session = useWorkbenchSession({ onCreate: props.onCreate })

  return (
    <div className={css.stack} style={{ fontSize: 12 }}>
      <Fold
        open={props.cur.sections.sessions}
        icon={FolderTree}
        title="策略会话"
        count={session.sessions.length}
        onToggle={() => props.onToggle("sessions")}
        action={
          <button
            type="button"
            className={css.headbtn}
            onClick={(event) => {
              event.stopPropagation()
              session.setOpen(true)
            }}
            aria-label="新建会话"
          >
            <Plus size={12} />
          </button>
        }
      >
        <div className={`${css.sessionlist} ${ui.scroll}`}>
          {session.sessions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${css.session} ${item.id === session.active ? css.sessionon : ""}`}
              onClick={() => session.setActive(item.id)}
            >
              <span className={css.name}>{item.title}</span>
              <span className={css.actions}>
                <button
                  type="button"
                  className={css.iconbtn}
                  aria-label="编辑会话"
                  onClick={(event) => {
                    event.stopPropagation()
                    session.rename(item.id)
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
                    session.remove(item.id)
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
        open={props.cur.sections.issues}
        icon={HelpCircle}
        title="问题清单"
        count={props.issues.length}
        onToggle={() => props.onToggle("issues")}
      >
        <div className={`${css.issuelist} ${ui.scroll}`}>
          {props.issues.length ? (
            props.issues.map((item) => (
              <button
                key={`${item.sid}-${item.body}`}
                type="button"
                className={css.issue}
                onClick={() => props.onIssuePick(item.sid)}
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
      </Fold>

      <Modal
        open={session.open}
        busy={session.busy}
        step={session.step}
        title={session.title}
        reqs={session.reqs}
        onClose={() => session.setOpen(false)}
        onStep={session.setStep}
        onTitle={session.setTitle}
        onReqs={session.setReqs}
        onSubmit={() => void session.submit()}
      />
    </div>
  )
}
