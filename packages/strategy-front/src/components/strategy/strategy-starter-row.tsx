import { Button } from "@/components/ui/button"
import { starters } from "@/lib/strategy-starter"

interface Props {
  disabled?: boolean
  onRun: (text: string) => void
}

const tone =
  "h-10 justify-between rounded-2xl border border-black/6 bg-muted/40 px-4 text-sm text-foreground shadow-none hover:bg-muted/70 dark:border-white/8 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"

export function StrategyStarterRow(props: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {starters.map((row) => (
        <Button
          key={row.label}
          type="button"
          variant="outline"
          size="sm"
          disabled={props.disabled}
          onClick={() => {
            props.onRun(row.text)
          }}
          className={tone}
          title={row.desc}
        >
          <span>{row.label}</span>
        </Button>
      ))}
    </div>
  )
}
