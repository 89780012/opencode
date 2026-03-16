import type { KeyboardEvent } from "react";
import { FaThinkPeaks } from "react-icons/fa";
import { FiSend } from "react-icons/fi";
import { IoCloudUploadOutline } from "react-icons/io5";
import { TbNetwork } from "react-icons/tb";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";

interface ChatInputProps {
  value: string;
  handleSubmit: () => void;
  onChange: (value: string) => void;
  hasMessages: boolean;
  isStreaming?: boolean;
}

export function ChatInput({
  value,
  handleSubmit,
  hasMessages,
  onChange,
  isStreaming = false,
}: ChatInputProps) {
  const canSubmit = value.trim().length > 0 && !isStreaming;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[#E5E5E5]">
      <div className="p-1">
        <AutoResizeTextarea
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          height={hasMessages ? 65 : 200}
          placeholder="请输入消息..."
        />
      </div>
      <div className="flex items-center justify-between p-2">
        <div className="left flex items-center justify-center text-center">
          <button
            type="button"
            className="mr-2 flex h-8 w-24 items-center justify-center rounded-xl border border-[#E6E6E6]"
          >
            <FaThinkPeaks />
            <span className="leading-8">深度思考</span>
          </button>
          <button
            type="button"
            className="flex h-8 w-24 items-center justify-center rounded-xl border border-[#E6E6E6]"
          >
            <TbNetwork />
            <span className="leading-8">联网搜索</span>
          </button>
        </div>
        <div className="right flex items-center">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center text-2xl"
          >
            <IoCloudUploadOutline />
          </button>
          <button
            type="button"
            className="ml-3 flex h-8 w-8 items-center justify-center text-2xl disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <FiSend />
          </button>
        </div>
      </div>
    </div>
  );
}
