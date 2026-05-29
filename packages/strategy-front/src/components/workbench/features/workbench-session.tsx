import { useChatRuntime } from "@/hooks/use-chat-runtime"
import { updateSessionAbortStatus } from "@/store/chat-session-slice"
import { useAppDispatch } from "@/store"
import type { LocalWorkspace } from "@/types/workspace"
import type { ChatMessageInfo, ChatStatus } from "@/types/chat"
import { SessionComposer } from "./session-composer"
import { SessionMessageList } from "./session-message-list"
import { WorkbenchPermissionPanel, WorkbenchQuestionPanel, WorkbenchTodoPanel } from "./session-request-panels"
import panels from "./session-panels.module.css"
import css from "./session-chat.module.css"

export function WorkbenchSession(props: {
  workspace: LocalWorkspace
  selectedSessionId: string | null
  detailLoading: boolean
  messages: ChatMessageInfo[]
  status: ChatStatus
  busy: boolean
  creating: boolean
  onCreate: () => Promise<string>
  onSelectSession: (value: string) => void
  onAbort: () => void
  onOpenDiff: (path: string) => void
}) {
  const dispatch = useAppDispatch()
  const chat = useChatRuntime({
    workspacePath: props.workspace.path,
    sessionId: props.selectedSessionId,
    status: props.status,
    busy: props.busy,
    createSession: props.onCreate,
    selectSession: props.onSelectSession,
  })
  return (
    <section className={css.root}>
      <SessionMessageList
        loading={props.detailLoading && !!props.selectedSessionId}
        messages={props.messages}
        status={props.status}
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
        disabled={props.creating}
        submitting={chat.submitting || props.creating}
        value={chat.draft.text}
        onAbort={props.onAbort}
        onChange={chat.draft.setText}
        onSubmit={() => {
          dispatch(updateSessionAbortStatus({ sessionId: props.selectedSessionId || "", status: false }))
          void chat.submit({ text: chat.draft.text })
        }}
      />
    </section>
  )
}
