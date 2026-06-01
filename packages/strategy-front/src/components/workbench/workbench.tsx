import { type CSSProperties } from "react"
import { Review } from "./features/review"
import { Side } from "./features/side"
import { StageView } from "./features/stage"
import { usePanels } from "./hooks/use-panels"
import { Handle } from "./layout/handle"
import { Topbar } from "./layout/topbar"
import shell from "./styles/layout/shell.module.css"

export function Workbench() {
  const panel = usePanels()

  return (
    <>
      <div className={shell.pane}>
        <div
          className={shell.shell}
          data-workbench
          style={
            {
              "--left": `${panel.left.w}px`,
            } as CSSProperties
          }
        >
          <Side onCreate={() => panel.right.setOpen(true)} />

          <Handle
            onDown={panel.left.onDown}
            onKey={panel.left.onKey}
            active={panel.left.active}
            min={220}
            max={460}
            width={panel.left.w}
            label="Resize left panel"
          />

          <main className={shell.main}>
            <Topbar />
            <StageView />
          </main>
        </div>
      </div>
      <Review
        open={panel.right.open}
        width={panel.right.w}
        resizing={panel.right.active}
        onDown={panel.right.onDown}
        onKey={panel.right.onKey}
        onClose={() => panel.right.setOpen(false)}
        onOpen={() => panel.right.setOpen(true)}
      />
    </>
  )
}
