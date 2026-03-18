import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  open: string[]
  active: string | null
  onPick: (path: string) => void
  onClose: (path: string) => void
}

const label = (paths: string[]) => {
  const seen = paths.reduce(
    (map, path) => {
      const name = path.split("/").pop() ?? path
      map.set(name, (map.get(name) ?? 0) + 1)
      return map
    },
    new Map<string, number>()
  )

  return paths.reduce(
    (map, path) => {
      const part = path.split("/").filter(Boolean)
      const name = part[part.length - 1] ?? path
      map[path] = seen.get(name) === 1 ? name : part.slice(-2).join("/")
      return map
    },
    {} as Record<string, string>
  )
}

export function WorkspaceFileTabs(props: Props) {
  const names = label(props.open)

  return (
    <div className="border-b bg-muted/10 px-2 py-1">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {props.open.length === 0 ? (
          <div className="px-2 py-1 text-xs text-muted-foreground">No open files</div>
        ) : (
          props.open.map((path) => {
            const active = path === props.active

            return (
              <div
                key={path}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1 rounded-md border pr-1 transition-colors",
                  active
                    ? "border-border bg-background text-foreground shadow-xs"
                    : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <button
                  type="button"
                  onClick={() => props.onPick(path)}
                  className="min-w-0 px-3 text-sm outline-none"
                  title={path}
                >
                  <span className="block max-w-48 truncate">{names[path]}</span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    props.onClose(path)
                  }}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Close ${names[path]}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
