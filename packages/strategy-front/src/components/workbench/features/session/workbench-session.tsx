import { useChatRuntime } from "@/hooks/use-chat-runtime"
import { updateSessionAbortStatus } from "@/store/chat-session-slice"
import { useAppDispatch } from "@/store"
import type { WorkbenchChat } from "../../hooks/use-workbench-chat"
import { SessionComposer } from "./session-composer"
import { SessionMessageList } from "./session-message-list"
import { WorkbenchPermissionPanel, WorkbenchQuestionPanel, WorkbenchTodoPanel } from "./session-request-panels"
import panels from "../../styles/session/session-panels.module.css"
import css from "../../styles/session/session-chat.module.css"

export function WorkbenchSession(props: {
  real: WorkbenchChat
  onOpenDiff: (path: string) => void
}) {
  const dispatch = useAppDispatch()
  const workspace = props.real.workspace
  const chat = useChatRuntime({
    workspacePath: workspace?.path,
    sessionId: props.real.chat.selectedSessionId,
    status: props.real.chat.status,
    busy: props.real.chat.busy,
    createSession: props.real.chat.createSession,
    selectSession: props.real.chat.selectSession,
  })

  if (!workspace) return null

  return (
    <section className={css.root}>
      <SessionMessageList
        loading={props.real.chat.detailLoading && !!props.real.chat.selectedSessionId}
        messages={props.real.chat.messages}
        status={props.real.chat.status}
        onOpenDiff={props.onOpenDiff}
      />
      <div className={panels.stack} style={{ padding: "0 1rem" }}>
        {chat.permission.req ? (
          <WorkbenchPermissionPanel
            req={chat.permission.req}
            sending={chat.permission.sending}
            onReject={() => void chat.permission.allow("reject")}
            onAllow={(value) => void chat.permission.allow(value)}
          />
        ) : null}
        {chat.question.req ? (
          <WorkbenchQuestionPanel
            req={chat.question.req}
            sending={chat.question.sending}
            onReject={() => void chat.question.reject()}
            onReply={(answers) => void chat.question.reply(answers)}
          />
        ) : null}
        {chat.todo.visible ? <WorkbenchTodoPanel todos={chat.todo.todos} preview={chat.todo.preview} /> : null}
      </div>

      <SessionComposer
        busy={chat.busy}
        disabled={props.real.chat.creating}
        submitting={chat.submitting || props.real.chat.creating}
        value={chat.draft.text}
        onAbort={() => void props.real.abort()}
        onChange={chat.draft.setText}
        onSubmit={() => {
          dispatch(updateSessionAbortStatus({ sessionId: props.real.chat.selectedSessionId || "", status: false }))
          void chat.submit({ text: chat.draft.text })
        }}
      />
    </section>
  )
}
