import { cn } from "@/lib/utils"

interface Props {
  title: string
  tips: string[]
  disabled?: boolean
  onPick?: (text: string) => void
}

export function ChatEmptyState(props: Props) {
  return (
    <div className="chat-empty-state pointer-events-none absolute inset-0 flex items-center justify-center px-8 py-12">
      <div className="pointer-events-auto flex w-full max-w-5xl flex-col items-center">
        <div className="chat-empty-title px-2 text-center text-[30px] font-semibold leading-[1.2] tracking-tight text-slate-900 dark:text-slate-50 sm:text-[36px]">
          {props.title}
        </div>
        <br />
        <div className="chat-empty-tips mt-8 flex flex-wrap justify-center gap-3">
          {props.tips.map((item) => (
            <button
              key={item}
              className={cn(
                "chat-empty-tip inline-flex min-h-11 max-w-full items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-left align-middle text-[13px] leading-[1.45] text-slate-700 shadow-sm transition appearance-none",
                "hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-[#29302e] dark:bg-[#171b1a] dark:text-[#dbe5e1] dark:hover:border-[#33403b] dark:hover:bg-[#1c2120] dark:hover:text-white",
                "disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60",
              )}
              disabled={props.disabled}
              onClick={() => props.onPick?.(item)}
              type="button"
            >
              <span className="block break-words align-middle">{item}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
