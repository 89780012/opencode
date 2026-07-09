import { useEffect, useState } from "react"
import { backtestApi } from "@/api/modules"
import type { BacktestConfig } from "@/types/backtest"
import css from "../styles/settings.module.css"

const init: BacktestConfig = {
  startTime: "",
  endTime: "",
  cash: 10000000,
  shStockSx: 1.5,
  shStockMinSx: 5,
  szStockSx: 1.5,
  szStockMinSx: 5,
  shStockGh: 0,
  szStockGh: 0,
  buyYh: 0,
  sellYh: 5,
  rf: 0.025,
  slippage: 0,
  isTickMode: false,
  useNewPrice: false,
  interval: "1d",
  closeLog: false,
}

const nums = [
  ["cash", "初始资金"],
  ["shStockSx", "沪市手续费(每万元)"],
  ["shStockMinSx", "沪市最低手续费(元)"],
  ["szStockSx", "深市手续费(每万元)"],
  ["szStockMinSx", "深市最低手续费(元)"],
  ["shStockGh", "沪市过户费(每万元)"],
  ["szStockGh", "深市过户费(每万元)"],
  ["buyYh", "买入印花税(每万元)"],
  ["sellYh", "卖出印花税(每万元)"],
  ["rf", "无风险利率"],
  ["slippage", "滑点(成本占比%)"],
] as const

type Num = (typeof nums)[number][0]

function time(value: string) {
  return value.replace(" ", "T")
}

function stamp(value: string) {
  return value.replace("T", " ")
}

export function BacktestPanel() {
  const [cfg, setCfg] = useState(init)
  const [load, setLoad] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tip, setTip] = useState({ kind: "", text: "" })

  useEffect(() => {
    let live = true
    void backtestApi.config().then((data) => {
      if (live) setCfg(data)
    }).catch((err) => {
      if (live) setTip({ kind: "error", text: err instanceof Error ? err.message : "读取回测配置失败" })
    }).finally(() => {
      if (live) setLoad(false)
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!tip.text) return
    const timer = window.setTimeout(() => setTip({ kind: "", text: "" }), 5000)
    return () => window.clearTimeout(timer)
  }, [tip.text])

  const setNum = (key: Num, value: string) => {
    setCfg((item) => ({ ...item, [key]: Number(value) }))
  }

  async function save() {
    setBusy(true)
    setTip({ kind: "info", text: "正在保存配置..." })
    try {
      const next = await backtestApi.saveConfig(cfg)
      setCfg(next)
      setTip({ kind: "success", text: "回测配置已保存" })
    } catch (err) {
      setTip({ kind: "error", text: err instanceof Error ? err.message : "保存回测配置失败" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={css.panel}>
      <div className={css.head}>
        <div>
          <h2>回测配置</h2>
          <p>配置 Smart CLI 回测默认入参。工作台侧栏回测配置入口会打开此页面。</p>
        </div>
        <div className={css.actions}>
          <button type="button" className={css.primary} onClick={() => void save()} disabled={load || busy}>
            {busy ? "保存中..." : "保存配置"}
          </button>
        </div>
      </div>

      {tip.text ? (
        <div className={`${css.savenote} ${tip.kind === "error" ? css.savenote_error : ""}`}>{tip.text}</div>
      ) : null}

      <div className={css.btform}>
        <div className={css.btrows}>
          <div className={css.btfield}>
            <label htmlFor="settings-backtest-start">开始时间</label>
            <input
              id="settings-backtest-start"
              type="datetime-local"
              value={time(cfg.startTime)}
              onChange={(event) => setCfg((item) => ({ ...item, startTime: stamp(event.target.value) }))}
            />
          </div>
          <div className={css.btfield}>
            <label htmlFor="settings-backtest-end">结束时间</label>
            <input
              id="settings-backtest-end"
              type="datetime-local"
              value={time(cfg.endTime)}
              onChange={(event) => setCfg((item) => ({ ...item, endTime: stamp(event.target.value) }))}
            />
          </div>
          {nums.map((item) => (
            <div key={item[0]} className={css.btfield}>
              <label htmlFor={`settings-backtest-${item[0]}`}>{item[1]}</label>
              <input
                id={`settings-backtest-${item[0]}`}
                type="number"
                step="any"
                value={cfg[item[0]]}
                onChange={(event) => setNum(item[0], event.target.value)}
              />
            </div>
          ))}
          <div className={css.btfield}>
            <label htmlFor="settings-backtest-interval">K线周期</label>
            <select
              id="settings-backtest-interval"
              value={cfg.interval}
              onChange={(event) => setCfg((item) => ({ ...item, interval: event.target.value === "1m" ? "1m" : "1d" }))}
            >
              <option value="1d">日线</option>
              <option value="1m">分钟线</option>
            </select>
          </div>
        </div>
        <div className={css.btchecks}>
          <label>
            <input
              type="checkbox"
              checked={cfg.isTickMode}
              onChange={(event) => setCfg((item) => ({ ...item, isTickMode: event.target.checked }))}
            />
            使用快照行情
          </label>
          <label>
            <input
              type="checkbox"
              checked={cfg.useNewPrice}
              onChange={(event) => setCfg((item) => ({ ...item, useNewPrice: event.target.checked }))}
            />
            现价成交
          </label>
          <label>
            <input
              type="checkbox"
              checked={cfg.closeLog}
              onChange={(event) => setCfg((item) => ({ ...item, closeLog: event.target.checked }))}
            />
            关闭日志
          </label>
        </div>
        <p className={css.note}>{load ? "正在读取配置..." : "配置保存后会作为下一次回测默认参数。"}</p>
      </div>
    </section>
  )
}
