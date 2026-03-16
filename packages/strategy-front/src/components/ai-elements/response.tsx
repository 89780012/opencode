"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

export type ResponseProps = ComponentProps<typeof Streamdown> & {
  isStreaming?: boolean;
};

export const Response = ({
  className,
  isStreaming = false,
  parseIncompleteMarkdown,
  ...props
}: ResponseProps) => (
  <Streamdown
    className={cn(
      "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
      className,
    )}
    isAnimating={isStreaming}
    parseIncompleteMarkdown={parseIncompleteMarkdown ?? isStreaming}
    {...props}
  />
);
