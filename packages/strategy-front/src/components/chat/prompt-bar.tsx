import { useEffect } from "react"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ComposerModel } from "@/hooks/use-chat-composer"

interface Props {
  value: string
  disabled?: boolean
  busy?: boolean
  submitting?: boolean
  agents: string[]
  models: ComposerModel[]
  agent?: string
  model?: string
  variant?: string | null
  vars: string[]
  onValueChange: (value: string) => void
  onSubmit: (value: string) => void
  onAbort: () => void
  onAgent: (value: string) => void
  onModel: (value: string) => void
  onVariant: (value: string) => void
}

const item = "h-8 min-w-0 rounded-xl border bg-muted/20 px-2 text-xs shadow-none"

export function PromptBar(props: Props) {
  const model = props.model
  const models = props.models
  const onModel = props.onModel
  const first = models[0] ? `${models[0].provider.id}/${models[0].id}` : ""
  const pick = models.some((item) => `${item.provider.id}/${item.id}` === model) ? (model ?? "") : first
  const stop = !!props.busy

  useEffect(() => {
    if (!pick) return
    if (model === pick) return
    onModel(pick)
  }, [model, onModel, pick])

  return (
    <PromptInput
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
      <PromptInputBody>
        <PromptInputTextarea maxHeight={200} minHeight={72} placeholder="输入你的消息..." />
      </PromptInputBody>
      <PromptInputFooter className="items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Select
            disabled={props.disabled || props.agents.length === 0}
            onValueChange={props.onAgent}
            value={props.agent ?? ""}
          >
            <SelectTrigger className={item}>
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              {props.agents.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "build" ? "Build" : item === "plan" ? "Plan" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select disabled={props.disabled || models.length === 0} onValueChange={onModel} value={pick}>
            <SelectTrigger className={`${item} max-w-[220px]`}>
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
          {/* {props.vars.length > 0 ? (
            <Select disabled={props.disabled} onValueChange={props.onVariant} value={props.variant ?? "default"}>
              <SelectTrigger className={`${item} max-w-[120px]`}>
                <SelectValue placeholder="默认" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">默认</SelectItem>
                {props.vars.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null} */}
        </div>
        <PromptInputSubmit
          disabled={props.disabled || (!stop && props.value.trim().length === 0)}
          status={stop ? "streaming" : props.submitting ? "submitted" : "ready"}
        />
      </PromptInputFooter>
    </PromptInput>
  )
}
