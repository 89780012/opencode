import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ComposerModel } from "@/types/composer"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent?: string
  model?: string
  models: ComposerModel[]
  variant?: string | null
  variants: string[]
  onModel: (value: string) => void
  onVariant: (value: string) => void
}

export function ComposerSettingsDialog(props: Props) {
  const pick = props.models.some((item) => `${item.provider.id}/${item.id}` === props.model)
    ? (props.model ?? "")
    : props.models[0]
      ? `${props.models[0].provider.id}/${props.models[0].id}`
      : ""

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>模型设置</DialogTitle>
          <DialogDescription>此页面默认使用固定 Agent，模型和变体配置会应用到当前工作区后续消息。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Agent</div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-foreground">
              {props.agent || "smartx-helper"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">模型</div>
            <Select value={pick} onValueChange={props.onModel} disabled={props.models.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {props.models.map((item) => (
                  <SelectItem key={`${item.provider.id}/${item.id}`} value={`${item.provider.id}/${item.id}`}>
                    {`${item.id} (${item.provider.id})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {props.variants.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">变体</div>
              <Select value={props.variant ?? "default"} onValueChange={props.onVariant}>
                <SelectTrigger>
                  <SelectValue placeholder="选择变体" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">default</SelectItem>
                  {props.variants.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="rounded-lg border border-dashed px-3 py-2 text-xs leading-5 text-muted-foreground">
            Agent 由嵌入页固定为 `smartx-helper`。如果你切换模型，新的配置会用于这个路径后续发起的消息。
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
