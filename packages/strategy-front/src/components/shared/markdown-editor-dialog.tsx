import { FileCode2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type Props = {
  open: boolean
  busy: boolean
  mode: "create" | "edit"
  title: string
  name_title: string
  name: string
  body_title: string
  body: string
  placeholder: string
  hint: string
  desc: string
  onOpenChange: (open: boolean) => void
  onName: (value: string) => void
  onBody: (value: string) => void
  onClose: () => void
  onSave: () => void
}

/**
 * 通用 Markdown 编辑弹窗，用于 agent 和 skill 的全局文件编辑。
 */
export function MarkdownEditorDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.desc}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-medium">{props.name_title}</div>
            <Input
              value={props.name}
              onChange={(event) => props.onName(event.target.value)}
              placeholder={props.placeholder}
              disabled={props.mode === "edit"}
            />
            <div className="text-muted-foreground text-xs leading-5">{props.hint}</div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileCode2 className="size-4" />
              {props.body_title}
            </div>
            <textarea
              value={props.body}
              onChange={(event) => props.onBody(event.target.value)}
              className="min-h-[420px] w-full rounded-md border bg-transparent px-3 py-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              spellCheck={false}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose} disabled={props.busy}>
            取消
          </Button>
          <Button type="button" onClick={props.onSave} disabled={props.busy}>
            {props.busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                保存中...
              </>
            ) : props.mode === "create" ? (
              "创建"
            ) : (
              "保存"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
