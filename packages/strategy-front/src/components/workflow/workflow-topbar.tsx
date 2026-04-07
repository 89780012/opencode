import { Braces, CheckCheck, Download, Play, Save } from "lucide-react"
import { Button } from "@/components/ui/button"

const items = [
  { key: "save", icon: Save, label: "保存", tone: "text-blue-600" },
  { key: "check", icon: CheckCheck, label: "校验", tone: "text-indigo-500" },
  { key: "run", icon: Play, label: "运行", tone: "text-emerald-600" },
  { key: "export", icon: Download, label: "导出", tone: "text-amber-600" },
  { key: "code", icon: Braces, label: "代码", tone: "text-violet-600" },
]

export function WorkflowTopbar(props: { onAction: (key: string) => void }) {
  return (
    <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/92 p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:bg-[#111417]/92">
      {items.map((item) => (
        <Button
          key={item.key}
          variant="ghost"
          size="icon-sm"
          className="rounded-full text-muted-foreground hover:bg-primary/6 hover:text-foreground"
          onClick={() => props.onAction(item.key)}
          title={item.label}
        >
          <item.icon className={`size-[18px] ${item.tone}`} strokeWidth={2.35} />
        </Button>
      ))}
    </div>
  )
}
