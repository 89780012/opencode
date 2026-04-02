import { useState } from "react"
import { toast } from "sonner"
import { workspaceApi } from "@/api/modules"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: (item: LocalWorkspace) => Promise<void> | void
}

function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === "string" && err) return err
  return fallback
}

export function StrategyImportDialog(props: Props) {
  const [path, setPath] = useState("")
  const [type, setType] = useState<"smartx" | "python" | "js" | "other">("other")
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setPath("")
    setType("other")
  }

  const submit = async () => {
    const value = path.trim()
    if (!value) {
      toast.error("请输入要导入的目录路径")
      return
    }

    setBusy(true)
    try {
      const data = await workspaceApi.importWorkspace(value, type)
      await props.onDone(data.workspace)
      props.onOpenChange(false)
      reset()
      toast.success(`已导入策略：${data.workspace.name}`)
    } catch (err) {
      toast.error(note(err, "导入策略失败"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        props.onOpenChange(open)
        if (!open) reset()
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>导入策略目录</DialogTitle>
          <DialogDescription>把任意本地文件夹加入策略注册表。导入只记录到 JSON，不会移动或复制文件。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="strategy-import-path">目录路径</Label>
            <Input
              id="strategy-import-path"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="例如：C:\\code\\my-strategy"
            />
          </div>

          <div className="space-y-2">
            <Label>策略类型</Label>
            <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smartx">SmartX</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="js">JS</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={busy}>
            取消
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "导入中..." : "导入"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
