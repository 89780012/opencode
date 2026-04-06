import { useState } from "react"
import { EyeIcon, XIcon } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { ChatImageInput } from "@/types/chat"

interface Props {
  files: ChatImageInput[]
  onRemove: (id: string) => void
}

export function ImageAttachments(props: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const file = props.files.find((item) => item.id === open)

  if (props.files.length === 0) return null

  return (
    <>
      <div className="mb-2 flex flex-wrap gap-2">
        {props.files.map((file) => (
          <div
            key={file.id}
            className="group/thumb relative w-[88px] overflow-hidden rounded-xl border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]"
          >
            <button type="button" onClick={() => setOpen(file.id)} className="relative block w-full text-left">
              <img src={file.url} alt={file.filename} className="h-14 w-[88px] object-cover" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover/thumb:bg-black/30 group-hover/thumb:opacity-100">
                <div className="inline-flex items-center rounded-full border border-white/70 bg-black/12 p-1.5 text-white shadow-sm ">
                  <EyeIcon className="size-3" />
                </div>
              </div>
              <div className="truncate px-2 py-1 text-[10px] text-muted-foreground">{file.filename}</div>
            </button>
            <button
              type="button"
              onClick={() => props.onRemove(file.id)}
              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
              aria-label={`Remove ${file.filename}`}
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <Dialog open={!!file} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="w-[min(92vw,960px)] max-w-[960px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-[#fcfcfa] p-0 dark:border-[#252e2b] dark:bg-[#101514]">
          {file ? (
            <>
              <div className="flex max-h-[85vh] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_55%)] p-4">
                <img
                  src={file.url}
                  alt={file.filename}
                  className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain"
                />
              </div>
              <div className="border-t px-4 py-3 text-sm text-muted-foreground">
                <div>{file.filename}</div>
                <div className="mt-1 text-xs opacity-75">按 Esc、点击遮罩或右上角关闭按钮退出预览。</div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
