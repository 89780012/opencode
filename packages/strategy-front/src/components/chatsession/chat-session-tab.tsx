import { ChatSessionList } from "@/components/chatsession/chat-session-list";
import { Button } from "@/components/ui/button";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";

export function ChatSessionTab() {
  // autoLoad: 首次加载
  const { loading, creating, createSession } = useChatSessions({
    autoLoad: true,
  });

  /** 点击按钮后创建新会话。 */
  const handleCreateSession = async () => {
    try {
      await createSession();
    } catch (error) {
      console.error("Failed to create chat session", error);
    }
  };

  return (
    <>
      <SidebarHeader className="gap-3.5 border-b p-3">
        <Button disabled={creating} onClick={handleCreateSession}>
          {creating ? "创建中..." : "+创建新会话"}
        </Button>
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <SidebarGroup className="h-full px-0">
          <SidebarGroupContent className="h-full overflow-hidden">
            <ChatSessionList loading={loading} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}
