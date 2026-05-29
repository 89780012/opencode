import { LayoutGrid, Settings } from "lucide-react"
import shell from "../layout.module.css"

export function Rail(props: { page: "bench" | "settings"; onPage: (page: "bench" | "settings") => void }) {
  return (
    <aside className={shell.rail}>
      <div className={shell.nav}>
        <button
          type="button"
          className={`${shell.navbtn} ${props.page === "bench" ? shell.navon : ""}`}
          onClick={() => props.onPage("bench")}
          aria-pressed={props.page === "bench"}
        >
          <LayoutGrid size={16} />
          <span className={shell.navtxt}>工作台</span>
        </button>
      </div>

      <div className={shell.nav}>
        <button
          type="button"
          className={`${shell.navbtn} ${props.page === "settings" ? shell.navon : ""}`}
          onClick={() => props.onPage("settings")}
          aria-pressed={props.page === "settings"}
        >
          <Settings size={16} />
          {/*<span className={shell.navtxt}>设置</span>*/}
        </button>
      </div>
    </aside>
  )
}
