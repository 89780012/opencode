"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type MessageRole = "user" | "assistant";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: MessageRole;
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "chat-item group flex min-w-0 w-full",
      from === "user" ? "is-user justify-end" : "is-assistant justify-start",
      className,
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "min-w-0 max-w-full space-y-2 text-sm leading-6",
      "group-[.is-user]:inline-flex group-[.is-user]:max-w-[85%] group-[.is-user]:flex-col",
      "group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
      "group-[.is-assistant]:w-full group-[.is-assistant]:text-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
