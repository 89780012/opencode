import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, ListTodo, LoaderCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatTodo } from "@/types/chat";

interface Props {
  todos: ChatTodo[];
  collapsed?: boolean;
  preview?: string;
}

function icon(status: string) {
  if (status === "completed") {
    return <CheckCircle2 className="size-4 text-emerald-600" />;
  }
  if (status === "in_progress") {
    return <LoaderCircle className="size-4 animate-spin text-sky-600" />;
  }
  if (status === "cancelled") {
    return <MinusCircle className="size-4 text-muted-foreground" />;
  }
  return <Circle className="size-4 text-muted-foreground" />;
}

export function TodoPanel(props: Props) {
  const [user, setUser] = useState<boolean | undefined>(undefined);
  const body = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);
  const total = props.todos.length;
  const count = useMemo(
    () => props.todos.filter((item) => item.status === "completed").length,
    [props.todos],
  );
  const collapsed = user ?? !!props.collapsed;

  useEffect(() => {
    if (collapsed) {
      return;
    }

    const root = body.current;
    if (!root) {
      return;
    }

    const el = root.querySelector("[data-in-progress]");
    if (!(el instanceof HTMLElement)) {
      return;
    }

    requestAnimationFrame(() => {
      el.scrollIntoView({
        block: "nearest",
      });
      const root = body.current;
      if (!root) {
        return;
      }
      setStuck(root.scrollTop > 0);
    });
  }, [collapsed, props.todos]);

  if (props.todos.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-background/95 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        collapsed ? "shadow-none" : "shadow-sm",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <ListTodo className="size-4" />
        </div>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => {
            setUser((value) => !(value ?? !!props.collapsed));
          }}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>Todos</span>
            <span className="text-xs text-muted-foreground">
              {count} / {total}
            </span>
          </div>
          <div className="relative mt-1 h-5 overflow-hidden text-xs text-muted-foreground">
            <div
              className={cn(
                "absolute inset-0 truncate transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                collapsed ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
              )}
            >
              {props.preview || "Tracking current work"}
            </div>
            <div
              className={cn(
                "absolute inset-0 truncate transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                collapsed ? "-translate-y-1 opacity-0" : "translate-y-0 opacity-100",
              )}
            >
              {`${total} items in progress`}
            </div>
          </div>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setUser((value) => !(value ?? !!props.collapsed));
          }}
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed ? "rotate-180" : "")} />
        </Button>
      </div>

      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div
          ref={body}
          className="relative min-h-0 max-h-56 overflow-y-auto border-t px-4 py-3"
          onScroll={(e) => {
            setStuck(e.currentTarget.scrollTop > 0);
          }}
        >
          <div className="space-y-2">
            {props.todos.map((item, i) => (
              <div
                key={`${item.content}:${item.status}:${i}`}
                data-in-progress={item.status === "in_progress" ? "" : undefined}
                className="flex items-start gap-3"
              >
                <div className="mt-0.5 shrink-0">{icon(item.status)}</div>
                <div
                  className={cn(
                    "min-w-0 text-sm leading-6 transition-[color,opacity,text-decoration-color] duration-200",
                    item.status === "completed" || item.status === "cancelled"
                      ? "text-muted-foreground line-through"
                      : "text-foreground",
                    item.status === "pending" ? "opacity-90" : "opacity-100",
                  )}
                >
                  {item.content}
                </div>
              </div>
            ))}
          </div>
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-background to-transparent transition-opacity duration-200",
              stuck ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </div>
    </div>
  );
}
