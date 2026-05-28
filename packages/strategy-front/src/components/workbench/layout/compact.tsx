import type { ReactNode } from "react"
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react"
import css from "./compact.module.css"

export function Compact(props: {
  open: boolean
  icon: LucideIcon
  title: string
  onToggle: () => void
  action?: ReactNode
  meta?: ReactNode
  children: ReactNode
}) {
  const Icon = props.icon

  return (
    <section className={`${css.root} ${props.open ? css.open : css.shut}`}>
      <div
        className={css.head}
        onClick={props.onToggle}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return
          event.preventDefault()
          props.onToggle()
        }}
        role="button"
        tabIndex={0}
        aria-expanded={props.open}
      >
        <span className={css.left}>
          <ChevronRight size={14} className={`${css.turn} ${props.open ? css.turnopen : ""}`} />
          <Icon size={14} className={css.icon} />
          <span>{props.title}</span>
        </span>
        <span className={css.right}>
          {props.meta ? <span className={css.meta}>{props.meta}</span> : null}
          {props.action ? (
            <span
              className={css.action}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {props.action}
            </span>
          ) : null}
          <ChevronDown size={14} className={`${css.fold} ${props.open ? css.foldopen : ""}`} />
        </span>
      </div>
      {props.open ? <div className={css.body}>{props.children}</div> : null}
    </section>
  )
}
