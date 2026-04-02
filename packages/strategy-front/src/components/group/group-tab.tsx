import { Plus, RefreshCw } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { GroupCreateDialog } from "@/components/group/group-create-dialog"
import { GroupList } from "@/components/group/group-list"
import { Button } from "@/components/ui/button"
import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader } from "@/components/ui/sidebar"
import { useGroupList } from "@/hooks/use-group-list"
import type { StrategyGroup } from "@/types/group"

export function GroupTab() {
  const nav = useNavigate()
  const { groups, loading, error, refresh } = useGroupList()
  const [open, setOpen] = useState(false)
  const occupied = groups.flatMap((group) => group.items.map((item) => item.path))

  const onSelect = (group: StrategyGroup) => {
    nav(`/app/groups/${group.id}`)
  }

  return (
    <>
      <SidebarHeader className="gap-2 border-b p-3">
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            新建组合
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
        </div>
        <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
          组合策略会自动创建多个真实工作区，并进入分屏 AI 协作页。
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <SidebarGroup className="h-full px-0">
          <SidebarGroupContent className="h-full overflow-hidden">
            <GroupList
              groups={groups}
              loading={loading}
              error={error}
              onRetry={() => void refresh()}
              onSelect={onSelect}
              onDelete={() => {}}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <GroupCreateDialog open={open} onOpenChange={setOpen} onDone={() => void refresh()} occupied={occupied} />
    </>
  )
}
