import type { WorkbenchChat } from "../../hooks/use-workbench-chat"
import { SessionMessageList } from "./session-message-list"
import { WorkbenchPermissionPanel, WorkbenchQuestionPanel, WorkbenchTodoPanel } from "./session-request-panels"
import panels from "../../styles/session/session-panels.module.css"
import css from "../../styles/session/session-chat.module.css"

export function WorkbenchSession(props: {
  real: WorkbenchChat
  chat: ReturnType<typeof import("@/hooks/use-chat-runtime").useChatRuntime>
  onOpenDiff: (path: string) => void
}) {
  const workspace = props.real.workspace

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
        {props.chat.permission.req ? (
          <WorkbenchPermissionPanel
            req={props.chat.permission.req}
            sending={props.chat.permission.sending}
            onReject={() => void props.chat.permission.allow("reject")}
            onAllow={(value) => void props.chat.permission.allow(value)}
          />
        ) : null}
        {props.chat.question.req ? (
          <WorkbenchQuestionPanel
            req={props.chat.question.req}
            sending={props.chat.question.sending}
            onReject={() => void props.chat.question.reject()}
            onReply={(answers) => void props.chat.question.reply(answers)}
          />
        ) : null}
        {props.chat.todo.visible ? <WorkbenchTodoPanel todos={props.chat.todo.todos} preview={props.chat.todo.preview} /> : null}
      </div>
    </section>
  )
}
