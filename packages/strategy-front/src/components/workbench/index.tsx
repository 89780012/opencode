import { useState } from "react"
import { Rail } from "./layout/rail"
import shell from "./layout/shell.module.css"
import ui from "./shared.module.css"
import { Workbench } from "./workbench"

export function Workstation() {
  const [page, setPage] = useState<"bench" | "settings">("bench")

  return (
    <div className={ui.root}>
      <div className={shell.frame}>
        <Rail page={page} onPage={setPage} />
        <div className={shell.pane}>
          {page === "bench" ? (
            <Workbench />
          ) : (
            <section className={shell.stub}>
              <div className={shell.stubcard}>
                <span className={shell.stubtag}>Settings</span>
                <h2>设置</h2>
                <p>这里先保留为空白占位页，后续可以接入工作台相关设置。</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
