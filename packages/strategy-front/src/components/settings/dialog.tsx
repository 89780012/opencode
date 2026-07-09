import { X } from "lucide-react"
import { SettingsContent } from "./layout/content"
import type { Tab } from "./types"
import ui from "../shared/styles/ui.module.css"
import css from "./styles/settings.module.css"

export function SettingsDialog(props: {
  open: boolean
  tab: Tab
  onTab: (tab: Tab) => void
  onOpenChange: (open: boolean) => void
}) {
  if (!props.open) return null

  return (
    <div className={css.overlay} onClick={() => props.onOpenChange(false)}>
      <div className={css.dialog} role="dialog" aria-modal="true" aria-label="设置" onClick={(event) => event.stopPropagation()}>
        <div className={css.dialogbar}>
          <div>
            <strong>设置</strong>
            <span>Provider、模型和回测配置</span>
          </div>
          <button type="button" className={ui.icon} onClick={() => props.onOpenChange(false)} aria-label="关闭设置">
            <X size={14} />
          </button>
        </div>
        <SettingsContent tab={props.tab} onTab={props.onTab} />
      </div>
    </div>
  )
}
