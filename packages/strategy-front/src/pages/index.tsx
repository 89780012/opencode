import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { ChatMessageList } from "@/components/chat-message-list";
import { PermissionPanel } from "@/components/chat/permission-panel";
import { PromptBar } from "@/components/chat/prompt-bar";
import { QuestionPanel } from "@/components/chat/question-panel";
import { useChatComposer } from "@/hooks/use-chat-composer";
import { useChatEvents } from "@/hooks/use-chat-events";
import { useChatPermission } from "@/hooks/use-chat-permission";
import { useChatQuestion } from "@/hooks/use-chat-question";
import { useChatSessionDetail } from "@/hooks/use-chat-session-detail";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import { usePromptSubmit } from "@/hooks/use-prompt-submit";
import { useAppSelector } from "@/hooks/useAppSelector";

export default function Home() {
  const workspace = useAppSelector((state) => state.workspaceView.selectedWorkspace);
  const path = workspace?.path ?? null;
  const [input, setInput] = useState("");

  useChatEvents(path);

  const { selectedSessionId, loading, creating, refreshSessions, createSession, selectSession } =
    useChatSessions(path);
  const composer = useChatComposer(path, selectedSessionId);
  const { messages, status, err, loading: detail } = useChatSessionDetail(path, selectedSessionId);
  const permission = useChatPermission(path, selectedSessionId, composer.accepting);
  const question = useChatQuestion(path, selectedSessionId);
  const { submitting, submit } = usePromptSubmit({
    workspacePath: path,
    sessionId: selectedSessionId,
    agent: composer.state?.agent,
    model: composer.state?.model,
    variant: composer.state?.variant,
    createSession,
    refreshSessions,
    selectSession,
    onSubmitted: () => setInput(""),
  });
  const empty = !selectedSessionId || (!detail && status.type !== "busy" && messages.length === 0);

  const onSubmit = async (value: string) => {
    if (!path) {
      toast.error("请先选择工作区");
      return;
    }
    if (!composer.state?.agent || !composer.state?.model) {
      toast.error("请先选择 Agent 和模型");
      return;
    }

    try {
      await submit(value);
    } catch (err) {
      console.error("Failed to submit prompt", err);
      toast.error("提交失败");
    }
  };

  return (
    <div className="flex h-full w-full min-w-0">
      <div className="relative flex h-full min-w-0 w-full flex-col">
        {!workspace ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-md space-y-3 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                <FolderOpen className="size-6 text-muted-foreground" />
              </div>
              <div className="text-xl font-semibold">请先选择工作区</div>
              <p className="text-sm text-muted-foreground">
                工作区决定当前会话绑定的代码目录。选择工作区后，左侧会自动切到会话标签，显示该工作区下的历史会话。
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative flex min-h-0 flex-1">
              <ChatMessageList
                err={err}
                messages={messages}
                loading={detail && !!selectedSessionId}
                status={status}
              />

              {empty ? (
                <div className="absolute inset-0 flex items-center justify-center px-6">
                  <div className="max-w-md space-y-3 text-center">
                    <div className="text-xl font-semibold">开始新会话</div>
                    <p className="text-sm text-muted-foreground">
                      请先在左侧会话标签选择历史会话，或点击“新建会话”后发送第一条消息来创建当前工作区的会话。
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shrink-0">
              <div className="mx-auto w-full max-w-[768px] space-y-3 px-4 py-2">
                {permission.req ? (
                  <PermissionPanel
                    key={permission.req.id}
                    req={permission.req}
                    sending={permission.sending}
                    onReject={() => {
                      void permission.allow("reject");
                    }}
                    onAllow={(value) => {
                      void permission.allow(value);
                    }}
                  />
                ) : null}
                {question.req ? (
                  <QuestionPanel
                    key={question.req.id}
                    req={question.req}
                    sending={question.sending}
                    onReject={() => {
                      void question.reject();
                    }}
                    onReply={(answers) => {
                      void question.reply(answers);
                    }}
                  />
                ) : null}
                <PromptBar
                  agent={composer.state?.agent}
                  agents={composer.agents}
                  accepting={composer.accepting}
                  disabled={!workspace || composer.load}
                  model={
                    composer.state?.model
                      ? `${composer.state.model.providerID}/${composer.state.model.modelID}`
                      : undefined
                  }
                  models={composer.models}
                  onAgent={composer.setAgent}
                  onModel={composer.setModel}
                  onPermission={composer.togglePermission}
                  onSubmit={(value) => {
                    void onSubmit(value);
                  }}
                  onValueChange={setInput}
                  onVariant={composer.setVariant}
                  submitting={submitting || creating || loading}
                  value={input}
                  variant={composer.state?.variant}
                  vars={composer.vars}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
