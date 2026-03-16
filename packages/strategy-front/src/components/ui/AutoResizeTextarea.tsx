import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";

interface AutoResizeTextareaProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  placeholder?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function AutoResizeTextarea({
  value,
  onChange,
  height = 65,
  placeholder = "请输入消息...",
  onKeyDown,
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className="w-full resize-none border-none px-2 pt-1 text-gray-700 outline-none placeholder:text-gray-400"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      rows={1}
      style={{ maxHeight: `${height}px`, overflowY: "auto", minHeight: "65px" }}
    />
  );
}
