import { cn } from "@/lib/utils"

interface Props {
  title: string
  tips: string[]
  disabled?: boolean
  onPick?: (text: string) => void
}

export function ChatEmptyState(props: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 py-10">
      <div className="pointer-events-auto flex w-full max-w-5xl flex-col items-center">
        <div className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{props.title}</div>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          {props.tips.map((item) => (
            <button
              key={item}
              className={cn(
                "max-w-full rounded-full bg-black/[0.04] px-4 py-2.5 text-left text-[13px] leading-5 text-foreground/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition",
                "hover:-translate-y-0.5 hover:bg-black/[0.06] hover:text-foreground dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:hover:bg-white/[0.09]",
                "disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60",
              )}
              disabled={props.disabled}
              onClick={() => props.onPick?.(item)}
              type="button"
            >
              <span className="break-words">{item}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
