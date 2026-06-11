import { FileText, Maximize2, Minimize2 } from "lucide-react"
import type { WorkbenchChat } from "../../hooks/use-workbench-chat"
import { useWorkbenchQuestion } from "../../hooks/use-workbench-question"
import { SessionMessageList } from "./session-message-list"
import { WorkbenchPermissionPanel, WorkbenchQuestionPanel, WorkbenchTodoPanel } from "./session-request-panels"
import panels from "../../styles/session/session-panels.module.css"
import css from "../../styles/session/session-chat.module.css"

export function WorkbenchSession(props: {
  real: WorkbenchChat
  chat: ReturnType<typeof import("@/hooks/use-chat-runtime").useChatRuntime>
  mode: "narrow" | "full"
  onMode: (mode: "narrow" | "full") => void
  onOpenDiff: (path: string) => void
}) {
  const workspace = props.real.workspace
  const question = useWorkbenchQuestion()
  const ask =
    question.questions
      .filter((item) => item.sessionId === props.real.chat.selectedSessionId)
      .sort((a, b) => b.createdAt - a.createdAt)[0]
      ?.body.trim() ?? ""

  if (!workspace) return null

  return (
    <section className={css.root}>
      <div className={css.bar}>
        <div className={css.topic}>
          <FileText size={14} />
          <span className={css.topiclabel}>当前问题：</span>
          <span className={css.topictext}>{ask || "暂无提问"}</span>
        </div>
        <button
          type="button"
          className={css.modes}
          data-mode={props.mode}
          aria-pressed={props.mode === "full"}
          aria-label={props.mode === "full" ? "切换到窄屏会话" : "切换到整宽会话"}
          title={props.mode === "full" ? "切换到窄屏会话" : "切换到整宽会话"}
          onClick={() => props.onMode(props.mode === "full" ? "narrow" : "full")}
        >
          <span className={`${css.mode} ${props.mode === "narrow" ? css.modeOn : ""}`}>
            <Minimize2 size={14} />
          </span>
          <span className={`${css.mode} ${props.mode === "full" ? css.modeOn : ""}`}>
            <Maximize2 size={14} />
          </span>
        </button>
      </div>
      <SessionMessageList
        loading={props.real.chat.detailLoading && !!props.real.chat.selectedSessionId}
        messages={props.real.chat.messages}
        mode={props.mode}
        status={props.real.chat.status}
        onOpenDiff={props.onOpenDiff}
      />
      <div className={`${panels.stack} ${props.mode === "full" ? css.panelFull : css.panelNarrow}`}>
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
