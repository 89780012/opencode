import { useState } from "react"
import { toast } from "sonner"
import { workspaceApi } from "@/api/modules/workspace"
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
import { useWorkspaceList } from "@/data/global-data-provider"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}

function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function WorkspaceCreateDialog(props: Props) {
  const { basePath, refresh, select } = useWorkspaceList()
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)

  const create = async () => {
    const value = name.trim()
    if (!value) {
      toast.error("工作区名称不能为空")
      return
    }

    setBusy(true)
    try {
      const data = await workspaceApi.createWorkspace(value)
      const next = await workspaceApi.openWorkspace(data.workspace.path)
      await refresh()
      select(next.workspace)
      props.onDone?.()
      props.onOpenChange(false)
      setName("")
      toast.success(`工作区已创建: ${data.workspace.name}`)
    } catch (err) {
      console.error("Failed to create workspace", err)
      toast.error(note(err, "创建工作区失败"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        props.onOpenChange(open)
        if (!open) setName("")
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建工作区</DialogTitle>
          <DialogDescription>在 {basePath || "~/.xtp-smart/plugins"} 创建后立即打开。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="工作区名称"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              void create()
            }}
          />
          <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            创建后会自动初始化 Git 仓库。
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => void create()} disabled={busy}>
            {busy ? "创建中..." : "创建并打开"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
