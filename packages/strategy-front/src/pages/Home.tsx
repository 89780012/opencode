import { useMemo, useState } from "react";
import { FolderOpen, History, Plus } from "lucide-react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/hooks/useAppSelector";
import { cn } from "@/lib/utils";
import { FaThinkPeaks } from "react-icons/fa";
import { IoCloudUploadOutline } from "react-icons/io5";
import { TbNetwork } from "react-icons/tb";
import { WorkspaceEditorPane } from "@/components/workspace/workspace-editor-pane";

const list = [
  { id: "recent-1", title: "Past Conversations" },
  { id: "recent-2", title: "Workspace Review" },
  { id: "recent-3", title: "Refactor Notes" },
];

export default function Home() {
  const workspace = useAppSelector((state) => state.workspaceView.selectedWorkspace);
  const [input, setInput] = useState("");
  const [session, setSession] = useState("");

  const title = useMemo(() => {
    if (!workspace) {
      return "选择工作区";
    }
    return workspace.name;
  }, [workspace]);

  return (
    <div className="flex h-full w-full min-w-0">
      {workspace ? (
        <div className="min-w-0 flex-1">
          <WorkspaceEditorPane workspace={workspace} />
        </div>
      ) : null}

      <div
        className={cn(
          "relative flex h-full min-w-0 flex-col",
          workspace ? "w-[34%] min-w-[420px]" : "w-full",
        )}
      >
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {workspace ? workspace.path : "从左侧工作区列表中选择一个文件夹后查看 UI 布局"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={session}
                onValueChange={setSession}
                disabled={!workspace}
              >
                <SelectTrigger className="h-9 min-w-52 border-[#2A2A2A] bg-[#171717] px-3 text-left text-sm text-white shadow-none hover:bg-[#1F1F1F]">
                  <div className="flex min-w-0 items-center gap-2">
                    <History className="size-4 shrink-0 text-zinc-400" />
                    <SelectValue placeholder="Past Conversations" />
                  </div>
                </SelectTrigger>
                <SelectContent align="end">
                  {list.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSession("")}
                disabled={!workspace}
              >
                <Plus className="size-4" />
                新会话
              </Button>
            </div>
          </div>
        </div>

        {!workspace ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-md space-y-3 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                <FolderOpen className="size-6 text-muted-foreground" />
              </div>
              <div className="text-xl font-semibold">先选择一个工作区</div>
              <p className="text-sm text-muted-foreground">
                当前页面已经移除 chat session 业务逻辑与事件，只保留工作区和会话区的界面结构。
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 px-6 py-6">
              <div className="mx-auto flex h-full w-full max-w-[640px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20 px-8 text-center">
                <div className="mb-3 text-lg font-semibold text-foreground">
                  Chat Session UI Placeholder
                </div>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  这里保留了主页面聊天区域的视觉布局，但会话创建、会话切换、历史加载、SSE 事件、计划状态和消息流逻辑已全部移除。
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <div className="mx-auto w-full max-w-[640px] px-4 py-2">
                <PromptInput
                  onSubmit={(message, event) => {
                    event.preventDefault();
                    setInput(message.text);
                  }}
                  onValueChange={setInput}
                  value={input}
                >
                  <PromptInputBody>
                    <PromptInputTextarea
                      maxHeight={200}
                      minHeight={65}
                      placeholder="请输入消息..."
                    />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools className="left text-center">
                      <PromptInputButton className="h-8 rounded-xl border border-[#E6E6E6] px-3">
                        <FaThinkPeaks />
                        <span className="leading-8">深度思考</span>
                      </PromptInputButton>
                      <PromptInputButton className="h-8 rounded-xl border border-[#E6E6E6] px-3">
                        <TbNetwork />
                        <span className="leading-8">联网搜索</span>
                      </PromptInputButton>
                    </PromptInputTools>
                    <div className="right flex items-center">
                      <PromptInputButton className="h-8 w-8 text-2xl" size="icon-sm">
                        <IoCloudUploadOutline />
                      </PromptInputButton>
                      <PromptInputSubmit className="ml-3" />
                    </div>
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
