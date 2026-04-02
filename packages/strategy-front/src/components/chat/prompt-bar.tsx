import { useEffect } from "react"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ComposerModel } from "@/types/composer"

interface Props {
  value: string
  className?: string
  compact?: boolean
  disabled?: boolean
  busy?: boolean
  submitting?: boolean
  agents: string[]
  models: ComposerModel[]
  agent?: string
  model?: string
  variant?: string | null
  variants: string[]
  onValueChange: (value: string) => void
  onSubmit: (value: string) => void
  onAbort: () => void
  onAgent: (value: string) => void
  onModel: (value: string) => void
  onVariant: (value: string) => void
}

const item =
  "h-8 min-w-0 rounded-xl border border-black/8 bg-black/[0.03] px-2 text-xs shadow-none dark:border-white/10 dark:bg-white/[0.04]"

export function PromptBar(props: Props) {
  const model = props.model
  const models = props.models
  const onModel = props.onModel
  const first = models[0] ? `${models[0].provider.id}/${models[0].id}` : ""
  const pick = models.some((item) => `${item.provider.id}/${item.id}` === model) ? (model ?? "") : first
  const stop = !!props.busy
  const area = props.compact ? 48 : 64
  const max = props.compact ? 144 : 200
  const foot = props.compact ? "items-end gap-2 px-2.5 pb-2.5 pt-1.5" : "items-end gap-3"
  const tone = props.compact ? "text-[13px]" : undefined
  const ctrl = props.compact ? "h-7" : ""

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
        props.onSubmit(msg.text)
      }}
      onValueChange={props.onValueChange}
      value={props.value}
    >
      <PromptInputBody className={props.compact ? "px-2.5 pt-2.5" : undefined}>
        <PromptInputTextarea className={tone} maxHeight={max} minHeight={area} placeholder="输入你的消息..." />
      </PromptInputBody>
      <PromptInputFooter className={foot}>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Select
            disabled={props.disabled || props.agents.length === 0}
            onValueChange={props.onAgent}
            value={props.agent ?? ""}
          >
            <SelectTrigger className={`${ctrl} ${item}`}>
              <SelectValue placeholder="选择模式" />
            </SelectTrigger>
            <SelectContent>
              {props.agents.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "build" ? "执行" : item === "plan" ? "规划" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select disabled={props.disabled || models.length === 0} onValueChange={onModel} value={pick}>
            <SelectTrigger className={`${ctrl} ${item} max-w-[220px]`}>
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {models.map((item) => (
                <SelectItem key={`${item.provider.id}/${item.id}`} value={`${item.provider.id}/${item.id}`}>
                  {`${item.id} (${item.provider.id})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* {props.variants.length > 0 ? (
            <Select disabled={props.disabled} onValueChange={props.onVariant} value={props.variant ?? "default"}>
              <SelectTrigger className={`${item} max-w-[120px]`}>
                <SelectValue placeholder="默认" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">默认</SelectItem>
                {props.variants.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null} */}
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
