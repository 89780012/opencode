import { useState } from "react"
import { EyeIcon } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface Props {
  src: string
  alt: string
  name?: string
}

export function ChatImagePart(props: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group/img relative overflow-hidden rounded-2xl border border-black/8 bg-background text-left transition hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
      >
        <img
          src={props.src}
          alt={props.alt}
          className="max-h-[240px] w-full max-w-[320px] object-contain bg-black/[0.02]"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover/img:bg-black/28 group-hover/img:opacity-100">
          <div className="inline-flex items-center rounded-full  bg-black/12 p-2 text-white shadow-sm">
            <EyeIcon className="size-3.5" />
          </div>
        </div>
        {props.name ? <div className="px-3 py-1.5 text-xs text-muted-foreground">{props.name}</div> : null}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,960px)] max-w-[960px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-[#fcfcfa] p-0 dark:border-[#252e2b] dark:bg-[#101514]">
          <div className="flex max-h-[85vh] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_55%)] p-4">
            <img
              src={props.src}
              alt={props.alt}
              className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain"
            />
          </div>
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">
            <div>{props.name ?? props.alt}</div>
            <div className="mt-1 text-xs opacity-75">按 Esc、点击遮罩或右上角关闭按钮退出预览。</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
