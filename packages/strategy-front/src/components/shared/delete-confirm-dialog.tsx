import { Loader2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  open: boolean
  busy?: boolean
  title: string
  name: string
  desc: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteConfirmDialog(props: Props) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (props.busy) return
        props.onOpenChange(open)
      }}
    >
      <DialogContent
        showCloseButton={!props.busy}
        className="max-w-md gap-5 rounded-2xl border border-slate-200/80 bg-white p-0 shadow-2xl dark:border-[#2d3431] dark:bg-[#111615]"
      >
        <div className="border-b border-slate-200/70 px-5 py-4 dark:border-[#222826]">
          <DialogHeader className="gap-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                <TriangleAlert className="size-4.5" />
              </div>
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-base font-semibold text-slate-900 dark:text-[#eef5f1]">
                  {props.title}
                </DialogTitle>
                <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-[#95a39d]">
                  {props.desc}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-5">
          <div className="rounded-2xl bg-slate-100/90 px-4 py-3 text-sm text-slate-700 dark:bg-[#171d1b] dark:text-[#d5dfda]">
            <span className="text-slate-500 dark:text-[#8b9892]">目标对象</span>
            <div className="mt-1 truncate font-medium text-slate-900 dark:text-[#eef5f1]">{props.name}</div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200/70 px-5 py-4 dark:border-[#222826]">
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={props.busy}>
            取消
          </Button>
          <Button variant="destructive" onClick={props.onConfirm} disabled={props.busy}>
            {props.busy ? <Loader2 className="size-4 animate-spin" /> : null}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
