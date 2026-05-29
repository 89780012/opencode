import type { ReactNode } from "react"
import { Rail } from "./layout/rail"
import shell from "./layout.module.css"

export function Layout(props: {
  page: "bench" | "settings"
  onPage: (page: "bench" | "settings") => void
  children: ReactNode
}) {
  return (
    <div className={shell.frame}>
      <Rail page={props.page} onPage={props.onPage} />
      <div className={shell.pane}>{props.children}</div>
    </div>
  )
}

