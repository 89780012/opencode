"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowDownIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { useCallback } from "react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"

export type ConversationProps = ComponentProps<typeof StickToBottom>

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative flex-1 overflow-y-hidden", className)}
    initial="instant"
    resize="smooth"
    role="log"
    {...props}
  />
)

export type ConversationContentProps = ComponentProps<typeof StickToBottom.Content>

export const ConversationContent = ({ className, ...props }: ConversationContentProps) => (
  <StickToBottom.Content className={cn("flex flex-col gap-4 p-4", className)} {...props} />
)

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string
  description?: string
  icon?: ReactNode
}

export const ConversationEmptyState = ({
  className,
  title = "暂无消息",
  description = "开始对话后，消息会显示在这里",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn("flex size-full flex-col items-center justify-center gap-3 p-8 text-center", className)}
    {...props}
  >
    {children ?? (
      <>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </>
    )}
  </div>
)

export type ConversationScrollButtonProps = ComponentProps<typeof Button>

export const ConversationScrollButton = ({ className, ...props }: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom()
  }, [scrollToBottom])

  if (isAtBottom) {
    return null
  }

  return (
    <Button
      className={cn("absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full", className)}
      onClick={handleScrollToBottom}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  )
}
