import { Lock, Maximize, Plus, Scan, Trash2 } from "lucide-react"

export function WorkflowMiniToolbar() {
  const items = [Plus, Scan, Maximize, Lock, Trash2]

  return (
    <div className="pointer-events-none absolute bottom-5 left-5 z-20">
      <div className="pointer-events-auto flex flex-col overflow-hidden rounded-sm border border-[#d7deea] bg-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
        {items.map((Item, i) => (
          <button
            key={i}
            type="button"
            className="flex h-10 w-9 items-center justify-center border-b border-[#e2e8f0] text-[#4a5568] transition-colors last:border-b-0 hover:bg-[#f8fafc] hover:text-foreground"
          >
            <Item className="size-[17px]" strokeWidth={2.15} />
          </button>
        ))}
      </div>
    </div>
  )
}
