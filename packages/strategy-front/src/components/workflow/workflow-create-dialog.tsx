import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
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
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string) => void
}

export function WorkflowCreateDialog(props: Props) {
  const [name, setName] = useState("")

  useEffect(() => {
    if (!props.open) {
      setName("")
    }
  }, [props.open])

  const text = name.trim()

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (props.busy) return
        props.onOpenChange(open)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新建工作流</DialogTitle>
          <DialogDescription>先创建一个空工作流草稿，保存名字后再进入详情页配置节点和工作区。</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">工作流名称</div>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：代码修复回环"
            onKeyDown={(event) => {
              if (event.key !== "Enter" || !text || props.busy) return
              event.preventDefault()
              props.onConfirm(text)
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={props.busy}>
            取消
          </Button>
          <Button onClick={() => props.onConfirm(text)} disabled={!text || props.busy}>
            {props.busy ? <Loader2 className="size-4 animate-spin" /> : null}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
