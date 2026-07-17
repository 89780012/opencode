import { useState } from "react"
import { toast } from "sonner"
import { useSystem } from "@/components/system/system-provider"
import { Switch } from "../ui/switch"
import css from "../styles/settings.module.css"

export function SystemPanel() {
  const sys = useSystem()
  const [busy, setBusy] = useState(false)

  async function save(key: keyof typeof sys.cfg.workflow, value: boolean) {
    setBusy(true)
    try {
      await sys.save({
        ...sys.cfg,
        workflow: {
          ...sys.cfg.workflow,
          [key]: value,
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
            onChange={(value) => void save("baseline", value)}
          />
        </div>
      </section>

      <section className={css.section}>
        <div className={css.titleline}>
          <div className={css.title}>
            <h3>自动审查</h3>
            <p>代码完成后自动审查；通过即继续，最多三轮。</p>
          </div>
          <Switch
            label="自动审查"
            checked={sys.cfg.workflow.review}
            disabled={sys.load || busy}
            onChange={(value) => void save("review", value)}
          />
        </div>
      </section>

      <section className={css.section}>
        <div className={css.titleline}>
          <div className={css.title}>
            <h3>自动调试</h3>
            <p>前序阶段通过后启动策略并检查新增运行日志。</p>
          </div>
          <Switch
            label="自动调试"
            checked={sys.cfg.workflow.debug}
            disabled={sys.load || busy}
            onChange={(value) => void save("debug", value)}
          />
        </div>
      </section>

      <section className={css.section}>
        <div className={css.titleline}>
          <div className={css.title}>
            <h3>自动回测</h3>
            <p>前序阶段通过后启动当前会话的异步回测。</p>
          </div>
          <Switch
            label="自动回测"
            checked={sys.cfg.workflow.backtest}
            disabled={sys.load || busy}
            onChange={(value) => void save("backtest", value)}
          />
        </div>
      </section>
    </section>
  )
}
