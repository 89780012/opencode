import { useEffect } from "react"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { PromptInputMessage } from "@/types/chat"
import type { ComposerModel } from "@/types/composer"

interface Props {
  value: string
  className?: string
  compact?: boolean
  disabled?: boolean
  busy?: boolean
  submitting?: boolean
  showAgent?: boolean
  showModel?: boolean
  agents: string[]
  models: ComposerModel[]
  agent?: string
  model?: string
  variant?: string | null
  variants: string[]
  onValueChange: (value: string) => void
  onSubmit: (value: PromptInputMessage) => void
  onAbort: () => void
  onAgent: (value: string) => void
  onModel: (value: string) => void
  onVariant: (value: string) => void
}

const item =
  "min-w-0 rounded-full border border-slate-200 bg-white text-[12px] font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-[#29302e] dark:bg-[#171b1a] dark:text-[#dbe5e1] dark:hover:border-[#33403b] dark:hover:bg-[#1d2221] dark:hover:text-white"

const menu = "custom-scrollbar max-h-[240px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#29302e] dark:bg-[#151918]"

export function PromptBar(props: Props) {
  const { model, models, onModel } = props
  const showAgent = props.showAgent !== false
  const showModel = props.showModel !== false
  const pick = models.some((item) => `${item.provider.id}/${item.id}` === model)
    ? (model ?? "")
    : models[0]
      ? `${models[0].provider.id}/${models[0].id}`
      : ""
  const stop = !!props.busy
  const area = props.compact ? 38 : 42
  const max = props.compact ? 120 : 144
  const foot = props.compact ? "items-end gap-1.5 px-2.5 pb-2 pt-1" : "items-end gap-1.5 px-2.5 pb-2 pt-1"
  const tone = props.compact ? "text-[13px]" : "text-[14px]"
  const ctrl = props.compact ? "h-7" : "h-7"
  const agent = props.compact ? "w-[112px]" : "w-[122px]"
  const modelw = props.compact ? "max-w-[188px]" : "max-w-[214px]"
  const cur = models.find((item) => `${item.provider.id}/${item.id}` === pick)

  useEffect(() => {
    if (!pick) return
    if (model === pick) return
    onModel(pick)
  }, [model, onModel, pick])

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
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {showAgent ? (
            <Select
              disabled={props.disabled || props.agents.length === 0}
              onValueChange={props.onAgent}
              value={props.agent ?? ""}
            >
              <SelectTrigger
                className={cn(
                  ctrl,
                  item,
                  agent,
                  "px-2.5 focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/10",
                )}
              >
                <SelectValue placeholder="选择助手" />
              </SelectTrigger>
              <SelectContent align="start" className={menu} position="popper">
                {props.agents.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {showModel ? (
            <Select disabled={props.disabled || models.length === 0} onValueChange={props.onModel} value={pick}>
              <SelectTrigger
                className={cn(
                  ctrl,
                  item,
                  modelw,
                  "px-2.5 focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/10",
                )}
              >
                {cur ? (
                  <div className="min-w-0 truncate">{`${cur.id} (${cur.provider.id})`}</div>
                ) : (
                  <SelectValue placeholder="选择模型" />
                )}
              </SelectTrigger>
              <SelectContent align="start" className={menu} position="popper">
                {models.map((item) => (
                  <SelectItem key={`${item.provider.id}/${item.id}`} value={`${item.provider.id}/${item.id}`}>
                    <span className="truncate">{`${item.id} (${item.provider.id})`}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
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
