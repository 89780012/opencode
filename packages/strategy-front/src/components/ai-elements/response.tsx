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
      "response-body min-w-0 w-full text-sm leading-7",
      className,
    )}
    isAnimating={isStreaming}
    parseIncompleteMarkdown={parseIncompleteMarkdown ?? isStreaming}
    {...props}
  />
);
