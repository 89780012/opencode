import { useEffect } from "react"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  "min-w-0 rounded-md border border-black/10 bg-background text-xs text-foreground shadow-none dark:border-white/12 dark:bg-white/[0.04]"

const menu = "custom-scrollbar max-h-[240px] overflow-y-auto rounded-md border-black/10 dark:border-white/12"

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
  const area = props.compact ? 48 : 64
  const max = props.compact ? 144 : 200
  const foot = props.compact ? "items-end gap-2 px-2.5 pb-2.5 pt-1.5" : "items-end gap-3"
  const tone = props.compact ? "text-[13px]" : undefined
  const ctrl = props.compact ? "h-7" : "h-8"
  const agent = props.compact ? "w-[112px]" : "w-[124px]"
  const modelw = props.compact ? "max-w-[190px]" : "max-w-[208px]"
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
      <PromptInputBody className={props.compact ? "px-2.5 pt-2.5" : undefined}>
        <PromptInputTextarea className={tone} maxHeight={max} minHeight={area} placeholder="输入你的消息..." />
      </PromptInputBody>
      <PromptInputFooter className={foot}>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {showAgent ? (
            <Select
              disabled={props.disabled || props.agents.length === 0}
              onValueChange={props.onAgent}
              value={props.agent ?? ""}
            >
              <SelectTrigger className={`${ctrl} ${item} ${agent} px-2.5`}>
                <SelectValue placeholder="选择智能体" />
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
              <SelectTrigger className={`${ctrl} ${item} ${modelw} px-2`}>
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
          className={props.compact ? "size-8" : undefined}
          disabled={props.disabled || (!stop && props.value.trim().length === 0)}
          status={stop ? "streaming" : props.submitting ? "submitted" : "ready"}
        />
      </PromptInputFooter>
    </PromptInput>
  )
}
