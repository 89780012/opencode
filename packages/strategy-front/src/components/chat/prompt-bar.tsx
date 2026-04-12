import { ImagePlusIcon } from "lucide-react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { ImageAttachments } from "@/components/chat/image-attachments"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { imageCount, imageModel, imagePart, imageTypes } from "@/lib/attachment"
import type { PromptInputMessage, ChatImageInput } from "@/types/chat"
import type { ComposerModel } from "@/types/composer"

interface Props {
  value: string
  files: ChatImageInput[]
  className?: string
  compact?: boolean
  disabled?: boolean
  busy?: boolean
  canImage?: boolean
  submitting?: boolean
  agents: string[]
  models: ComposerModel[]
  agent?: string
  model?: string
  variant?: string | null
  variants: string[]
  onValueChange: (value: string) => void
  onFilesChange: (files: ChatImageInput[]) => void
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
  const upload = props.compact ? "size-7" : "size-8"
  const ref = useRef<HTMLInputElement>(null)
  const cur = models.find((item) => `${item.provider.id}/${item.id}` === pick)

  const vision = (on: boolean) =>
    on ? (
      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
        识图
      </span>
    ) : null

  useEffect(() => {
    if (!pick) return
    if (model === pick) return
    onModel(pick)
  }, [model, onModel, pick])

  const fail = (txt: string) => {
    toast.error(txt)
  }

  const add = async (list: FileList | File[]) => {
    if (!props.canImage) {
      fail("当前模型不支持图片输入。")
      return
    }

    const next = [...props.files]
    for (const file of Array.from(list)) {
      if (next.length >= imageCount) {
        fail(`最多只能上传 ${imageCount} 张图片。`)
        break
      }
      const result = await imagePart(file)
      if ("err" in result) {
        if (result.err === "type") fail("仅支持 PNG、JPEG、GIF 和 WEBP 图片。")
        if (result.err === "size") fail("每张图片必须小于等于 10MB。")
        if (result.err === "read") fail("读取所选图片失败。")
        continue
      }
      next.push(result.part)
    }
    props.onFilesChange(next)
  }

  return (
    <PromptInput
      className={props.className}
      files={props.files}
      onFilesChange={props.onFilesChange}
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        if (!event.dataTransfer?.files.length) return
        void add(event.dataTransfer.files)
      }}
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
        <input
          ref={ref}
          type="file"
          accept={imageTypes.join(",")}
          className="hidden"
          multiple
          onChange={(event) => {
            if (!event.target.files?.length) return
            void add(event.target.files)
            event.target.value = ""
          }}
        />
        <ImageAttachments
          files={props.files}
          onRemove={(id) => props.onFilesChange(props.files.filter((file) => file.id !== id))}
        />
        {!props.canImage && props.files.length > 0 ? (
          <div className="mb-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
            发送图片前请切换到其他模型
          </div>
        ) : null}
        <PromptInputTextarea
          className={tone}
          maxHeight={max}
          minHeight={area}
          placeholder="输入你的消息..."
          onPaste={(event) => {
            const files = Array.from(event.clipboardData?.files ?? [])
            if (files.length === 0) return
            event.preventDefault()
            void add(files)
          }}
        />
      </PromptInputBody>
      <PromptInputFooter className={foot}>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
          <Select disabled={props.disabled || models.length === 0} onValueChange={props.onModel} value={pick}>
            <SelectTrigger className={`${ctrl} ${item} ${modelw} px-2`}>
              {cur ? (
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{`${cur.id} (${cur.provider.id})`}</span>
                  {vision(imageModel(cur))}
                </div>
              ) : (
                <SelectValue placeholder="选择模型" />
              )}
            </SelectTrigger>
            <SelectContent align="start" className={menu} position="popper">
              {models.map((item) => (
                <SelectItem key={`${item.provider.id}/${item.id}`} value={`${item.provider.id}/${item.id}`}>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{`${item.id} (${item.provider.id})`}</span>
                    {vision(imageModel(item))}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PromptInputButton
            className={`${upload} rounded-md p-0`}
            disabled={props.disabled}
            aria-label="上传图片"
            onClick={() => {
              if (!props.canImage) {
                fail("当前模型不支持图片输入。")
                return
              }
              ref.current?.click()
            }}
          >
            <ImagePlusIcon className="size-4" />
          </PromptInputButton>
        </div>
        <PromptInputSubmit
          className={props.compact ? "size-8" : undefined}
          disabled={props.disabled || (!stop && props.value.trim().length === 0 && props.files.length === 0)}
          status={stop ? "streaming" : props.submitting ? "submitted" : "ready"}
        />
      </PromptInputFooter>
    </PromptInput>
  )
}
