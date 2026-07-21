import { SettingsContent } from "./layout/content"
import css from "./styles/settings.module.css"
import type { Tab } from "./types"

export function SettingsPage(props: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <div className={css.page}>
      <SettingsContent tab={props.tab} onTab={props.onTab} />
    </div>
  )
}
