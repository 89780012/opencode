import { MessageSquareText, Sparkles } from "lucide-react"

interface Props {
  title: string
  desc: string
  tips: string[]
}

export function ChatEmptyState(props: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl rounded-[28px] border border-black/6 bg-black/[0.02] p-6 text-center shadow-sm dark:border-white/8 dark:bg-white/[0.03] dark:shadow-none">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm dark:bg-[#171d1b] dark:text-[#dbe6e0] dark:shadow-none">
          <Sparkles className="size-5" />
        </div>
        <div className="mt-4 text-base font-semibold text-foreground">{props.title}</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{props.desc}</p>
        <div className="mt-4 space-y-2 text-left">
          {props.tips.map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 rounded-2xl bg-white/90 px-3 py-2 text-sm text-slate-600 dark:bg-[#141918] dark:text-[#a8b4af]"
            >
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-slate-400 dark:text-[#7e8b86]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
