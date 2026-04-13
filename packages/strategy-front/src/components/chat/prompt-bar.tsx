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
import type { ChatImageInput, PromptInputMessage } from "@/types/chat"
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
  showAgent?: boolean
  showModel?: boolean
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
  const upload = props.compact ? "size-7" : "size-8"
  const ref = useRef<HTMLInputElement>(null)
  const cur = models.find((item) => `${item.provider.id}/${item.id}` === pick)

  const vision = (on: boolean) =>
    on ? (
      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
        璇嗗浘
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
      fail("褰撳墠妯″瀷涓嶆敮鎸佸浘鐗囪緭鍏ャ€?")
      return
    }

    const next = [...props.files]
    for (const file of Array.from(list)) {
      if (next.length >= imageCount) {
        fail(`鏈€澶氬彧鑳戒笂浼?${imageCount} 寮犲浘鐗囥€俙`)
        break
      }
      const out = await imagePart(file)
      if ("err" in out) {
        if (out.err === "type") fail("浠呮敮鎸?PNG銆丣PEG銆丟IF 鍜?WEBP 鍥剧墖銆?")
        if (out.err === "size") fail("姣忓紶鍥剧墖蹇呴』灏忎簬绛変簬 10MB銆?")
        if (out.err === "read") fail("璇诲彇鎵€閫夊浘鐗囧け璐ゃ€?")
        continue
      }
      next.push(out.part)
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
            鍙戦€佸浘鐗囧墠璇峰垏鎹㈠埌鍏朵粬妯″瀷
          </div>
        ) : null}
        <PromptInputTextarea
          className={tone}
          maxHeight={max}
          minHeight={area}
          placeholder="杈撳叆浣犵殑娑堟伅..."
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
          {showAgent ? (
            <Select
              disabled={props.disabled || props.agents.length === 0}
              onValueChange={props.onAgent}
              value={props.agent ?? ""}
            >
              <SelectTrigger className={`${ctrl} ${item} ${agent} px-2.5`}>
                <SelectValue placeholder="閫夋嫨鏅鸿兘浣?" />
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
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{`${cur.id} (${cur.provider.id})`}</span>
                    {vision(imageModel(cur))}
                  </div>
                ) : (
                  <SelectValue placeholder="閫夋嫨妯″瀷" />
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
          ) : null}
          <PromptInputButton
            className={`${upload} rounded-md p-0`}
            disabled={props.disabled}
            aria-label="涓婁紶鍥剧墖"
            onClick={() => {
              if (!props.canImage) {
                fail("褰撳墠妯″瀷涓嶆敮鎸佸浘鐗囪緭鍏ャ€?")
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
