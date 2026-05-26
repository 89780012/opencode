import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { cn } from "@/lib/utils"
import type { PromptInputMessage } from "@/types/chat"

interface Props {
  value: string
  className?: string
  compact?: boolean
  disabled?: boolean
  busy?: boolean
  submitting?: boolean
  onValueChange: (value: string) => void
  onSubmit: (value: PromptInputMessage) => void
  onAbort: () => void
}

export function PromptBar(props: Props) {
  const stop = !!props.busy
  const area = props.compact ? 38 : 42
  const max = props.compact ? 120 : 144
  const foot = props.compact ? "items-end gap-1.5 px-2.5 pb-2 pt-1" : "items-end gap-1.5 px-2.5 pb-2 pt-1"
  const tone = props.compact ? "text-[13px]" : "text-[14px]"

  return (
    <PromptInput
      className={props.className}
      onSubmit={(msg) => {
        if (stop) {
          props.onAbort()
          return
        }
        props.onSubmit(msg)
      }}
      onValueChange={props.onValueChange}
      value={props.value}
    >
      <PromptInputBody className={props.compact ? "px-2.5 pt-2" : undefined}>
        <PromptInputTextarea
          className={tone}
          maxHeight={max}
          minHeight={area}
          placeholder="输入你的策略想法、回测目标，或需要我协助的问题..."
        />
      </PromptInputBody>
      <PromptInputFooter className={foot}>
        <div className="min-w-0 flex-1" />
        <PromptInputSubmit
          className={cn(
            props.compact ? "size-7 rounded-full" : "size-7 rounded-full",
            "shrink-0 bg-primary text-primary-foreground shadow-none hover:bg-primary/90",
          )}
          disabled={props.disabled || (!stop && props.value.trim().length === 0)}
          status={stop ? "streaming" : props.submitting ? "submitted" : "ready"}
        />
      </PromptInputFooter>
    </PromptInput>
  )
}
