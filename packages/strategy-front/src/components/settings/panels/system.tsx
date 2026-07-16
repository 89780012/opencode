import { useState } from "react"
import { toast } from "sonner"
import { useSystem } from "@/components/system/system-provider"
import { Switch } from "../ui/switch"
import css from "../styles/settings.module.css"

export function SystemPanel() {
  const sys = useSystem()
  const [busy, setBusy] = useState(false)

  async function save(baseline: boolean) {
    setBusy(true)
    try {
      await sys.save({
        ...sys.cfg,
        workflow: {
          ...sys.cfg.workflow,
          baseline,
        },
      })
      toast.success("系统配置已保存")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "系统配置保存失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={css.panel}>
      <div className={css.head}>
        <div>
          <h2>系统配置</h2>
          <p>控制工作台会话中的自动工作流。</p>
        </div>
      </div>

      <section className={css.section}>
        <div className={css.titleline}>
          <div className={css.title}>
            <h3>工作区基线</h3>
            <p>启用后执行工作区分析，并根据分析结果生成流程图。</p>
          </div>
          <Switch
            label="工作区分析与流程图"
            checked={sys.cfg.workflow.baseline}
            disabled={sys.load || busy}
            onChange={(baseline) => void save(baseline)}
          />
        </div>
      </section>
    </section>
  )
}
