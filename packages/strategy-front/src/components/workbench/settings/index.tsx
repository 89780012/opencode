import { Box, Cpu, X } from "lucide-react"
import { useState } from "react"
import { ConnectDialog } from "./connect-dialog"
import { CustomDialog } from "./custom-dialog"
import { ModelsPanel } from "./models-panel"
import { ProvidersPanel } from "./providers-panel"
import css from "./settings.module.css"
import type { Tab } from "./types"
import { useSettings } from "./use-settings"

const tabs = [
  { key: "providers", icon: Box, label: "提供商" },
  { key: "models", icon: Cpu, label: "模型" },
] as const

function SettingsContent() {
  const app = useSettings()
  const [tab, setTab] = useState<Tab>("providers")

  return (
    <>
      <div className={css.shell}>
        <aside className={css.side}>
          <div className={css.logo}>配置项</div>
          <div className={css.nav}>
            {tabs.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`${css.navbtn} ${tab === item.key ? css.navon : ""}`}
                  onClick={() => setTab(item.key)}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <main className={css.main}>
          {tab === "providers" ? <ProvidersPanel app={app} /> : <ModelsPanel app={app} onProviders={() => setTab("providers")} />}
        </main>
      </div>

      <ConnectDialog
        open={!!app.page.item}
        item={app.page.item}
        list={app.page.item ? app.page.list[app.page.item.id] : undefined}
        onOpenChange={(open) => {
          if (!open) app.page.setItem(undefined)
        }}
        onDone={async () => {
          await app.page.refresh()
          await app.prv.refresh()
        }}
      />

      <CustomDialog
        open={app.page.customOpen}
        ids={app.page.ids}
        cfg={app.page.config}
        onOpenChange={app.page.setCustomOpen}
        onDone={async () => {
          await app.page.refresh()
          await app.prv.refresh()
        }}
      />
    </>
  )
}

export function SettingsDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!props.open) return null

  return (
    <div className={css.overlay} onClick={() => props.onOpenChange(false)}>
      <div className={css.dialog} role="dialog" aria-modal="true" aria-label="设置" onClick={(event) => event.stopPropagation()}>
        <div className={css.dialogbar}>
          <div>
            <strong>设置</strong>
            <span>Provider 和模型配置</span>
          </div>
          <button type="button" className={css.iconbtn} onClick={() => props.onOpenChange(false)} aria-label="关闭设置">
            <X size={14} />
          </button>
        </div>
        <SettingsContent />
      </div>
    </div>
  )
}
