import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { groupApi } from "@/api/modules/group"
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
import type { StrategyGroup } from "@/types/group"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: (group: StrategyGroup) => void
  redirect?: boolean
}

function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function GroupCreateDialog(props: Props) {
  const nav = useNavigate()
  const [name, setName] = useState("")
  const [count, setCount] = useState("2")
  const [busy, setBusy] = useState(false)

  const create = async () => {
    const value = name.trim()
    if (!value) {
      toast.error("请输入组合策略名称")
      return
    }

    setBusy(true)
    try {
      const data = await groupApi.create(value, Number(count))
      props.onDone?.(data.group)
      props.onOpenChange(false)
      setName("")
      setCount("2")
      toast.success(`组合策略已创建：${data.group.name}`)
      if (props.redirect) {
        nav(`/app/groups/${data.group.id}`)
      }
    } catch (err) {
      console.error("Failed to create group", err)
      toast.error(note(err, "创建组合策略失败"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        props.onOpenChange(open)
        if (!open) {
          setName("")
          setCount("2")
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建组合策略</DialogTitle>
          <DialogDescription>一次创建多个真实策略工作区，并在列表中生成一条组合记录。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">组合名称</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：日内双策略"
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                void create()
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>策略数量</Label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 个策略</SelectItem>
                <SelectItem value="3">3 个策略</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            创建后会自动生成 `{name || "组合名"}-1 ... {name || "组合名"}-{count}` 工作区，并初始化 Git 仓库。
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => void create()} disabled={busy}>
            {busy ? "创建中..." : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
