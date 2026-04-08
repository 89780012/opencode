import { Boxes } from "lucide-react"

export function WorkflowEmpty() {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-background px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-[#18201e] dark:text-[#b8c7c0]">
        <Boxes className="size-5" />
      </div>
      <div className="space-y-1">
        <div className="text-base font-semibold">还没有工作流</div>
        <p className="text-sm text-muted-foreground">
          新建一个工作流后，就可以在同一工作区内串起规划、执行、检查和修复回环。
        </p>
      </div>
    </div>
  )
}
