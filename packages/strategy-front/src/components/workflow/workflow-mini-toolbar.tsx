import { Lock, Maximize, Plus, Scan, Trash2 } from "lucide-react"

const items = [
  { icon: Plus, title: "新增节点" },
  { icon: Scan, title: "查看全图" },
  { icon: Maximize, title: "适配画布" },
  { icon: Lock, title: "锁定布局" },
  { icon: Trash2, title: "删除选中" },
]

export function WorkflowMiniToolbar() {
  return (
    <div className="pointer-events-none absolute bottom-5 left-5 z-20">
      <div className="pointer-events-auto flex flex-col overflow-hidden rounded-sm border border-[#d7deea] bg-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            title={item.title}
            aria-label={item.title}
            className="flex h-10 w-9 items-center justify-center border-b border-[#e2e8f0] text-[#4a5568] transition-colors last:border-b-0 hover:bg-[#f8fafc] hover:text-foreground"
          >
            <item.icon className="size-[17px]" strokeWidth={2.15} />
          </button>
        ))}
      </div>
    </div>
  )
}
