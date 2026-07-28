import { Activity, CheckCircle2, Circle, CircleAlert, LoaderCircle, PanelRightOpen, PauseCircle, X } from "lucide-react"
import { useMemo, useState } from "react"
import { bind } from "@/lib/session-workflow"
import { view } from "@/lib/workflow-view"
import { useAppSelector } from "@/store"
import common from "../../styles/session/session-common.module.css"
import css from "../../styles/workflow/workflow-float.module.css"

type State = "pending" | "running" | "paused" | "done" | "error"

function Icon(props: { state: State }) {
  if (props.state === "running") return <LoaderCircle size={15} className={common.spin} />
  if (props.state === "paused") return <PauseCircle size={15} />
  if (props.state === "done") return <CheckCircle2 size={15} />
  if (props.state === "error") return <CircleAlert size={15} />
  return <Circle size={15} />
}

export function WorkflowFloat() {
  const [open, setOpen] = useState(false)
  const row = useAppSelector((state) => state.workbench.workflow)
  const reviews = useAppSelector((state) => state.workbench.reviews)
  const backtests = useAppSelector((state) => state.workbench.backtests)
  const events = useAppSelector((state) => state.workbench.progress)
  const messages = useAppSelector((state) => (row ? (state.chatSession.messages[row.sessionId] ?? []) : []))
  const parts = useAppSelector((state) => state.chatSession.parts)
  const reviewId = useMemo(
    () => (row ? (bind(messages, parts, [row.id])[row.id]?.reviewId ?? "") : ""),
    [messages, parts, row],
  )
  const review = useMemo(() => reviews.find((item) => item.reviewId === reviewId), [reviewId, reviews])
  const backtest = useMemo(() => backtests.find((item) => item.id === row?.backtestId), [backtests, row?.backtestId])
  const progress = useMemo(
    () =>
      row ? events.filter((item) => item.sessionId === row.sessionId && item.createdAt >= row.createdAt).slice(-5) : [],
    [events, row],
  )

  if (!row) return null

  const failed = row.state === "failed" || row.state === "review_exhausted" || row.state === "cancelled"
  const paused = row.state === "paused"
  const done = row.stage === "done" && !failed
  const active = !done && !failed && !paused
  const flow = view(row, review, backtest)
  const label = paused
    ? "流程已暂停"
    : failed
    ? "流程已停止"
    : done
      ? "流程已完成"
      : row.stage === "review"
        ? "正在审查"
        : row.stage === "debug"
          ? "正在调试"
          : "正在回测"
  const detail = paused
    ? "当前阶段已保留，等待继续。"
    : row.error || row.summary || (active ? "策略工作流正在按顺序执行。" : "策略工作流已经结束。")
  const steps = [
    row.reviewEnabled
      ? {
          key: "review",
          title: `策略审查${row.reviewRound ? ` · 第 ${row.reviewRound} 轮` : ""}`,
          detail:
            review?.summary ||
            (flow.review === "done"
              ? "审查已通过。"
              : flow.review === "paused"
                ? "审查已暂停，等待继续。"
              : flow.review === "pending"
                ? "等待自动审查启动。"
                : row.summary || row.error || "正在核对需求、策略实现和风险控制。"),
          meta: review?.reviewId || "",
          state: flow.review,
        }
      : null,
    row.debugEnabled
      ? {
          key: "debug",
          title: "策略调试",
          detail:
            flow.debug === "pending"
              ? "等待审查通过后启动。"
              : flow.debug === "paused"
                ? "调试已暂停，等待继续。"
              : flow.debug === "done"
                ? "启动、存活状态和增量日志检查已通过。"
                : row.summary || row.error || "正在启动策略并检查新增运行日志。",
          meta: row.debugId,
          state: flow.debug,
        }
      : null,
    row.backtestEnabled
      ? {
          key: "backtest",
          title: "策略回测",
          detail: backtest
            ? backtest.status === "failed"
              ? backtest.error || "回测执行失败。"
              : backtest.status === "done"
                ? "回测已完成，结果已写入当前会话。"
                : `后台任务正在运行，当前进度 ${Math.round(backtest.progress)}%。`
            : flow.backtest === "pending"
              ? "等待前序阶段通过后启动。"
              : flow.backtest === "paused"
                ? "回测已暂停，等待继续。"
              : row.summary || row.error || "正在创建回测任务。",
          meta: backtest?.btId || row.backtestId,
          state: flow.backtest,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => !!item)

  return (
    <aside className={css.root} data-open={open}>
      {open ? (
        <section className={css.panel} aria-label="策略工作流状态">
          <div className={css.head}>
            <span className={css.title}>
              <Activity size={16} />
              <strong>策略工作流</strong>
              <em data-state={paused ? "paused" : failed ? "error" : done ? "done" : "running"}>{label}</em>
            </span>
            <button type="button" className={css.action} onClick={() => setOpen(false)} aria-label="收起自动工作流">
              <X size={15} />
            </button>
          </div>
          <div className={css.body}>
            <p className={css.summary}>{detail}</p>
            <div className={css.steps}>
              {steps.map((step) => (
                <div key={step.key} className={css.step} data-state={step.state}>
                  <span className={css.icon}>
                    <Icon state={step.state} />
                  </span>
                  <span className={css.copy}>
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                    {step.meta ? <code title={step.meta}>{step.meta}</code> : null}
                  </span>
                </div>
              ))}
            </div>
            {progress.length ? (
              <div className={css.events}>
                <strong>最近活动</strong>
                {progress.map((event) => (
                  <div key={event.id} className={css.event}>
                    <span>{event.title || event.kind}</span>
                    <p>{event.detail || "已完成"}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <button
          type="button"
          className={css.trigger}
          data-state={paused ? "paused" : failed ? "error" : done ? "done" : "running"}
          onClick={() => setOpen(true)}
          aria-label="展开策略工作流"
          aria-expanded={false}
          title={`${label}，点击展开`}
        >
          {active ? (
            <LoaderCircle size={17} className={common.spin} style={{ margin: "auto" }} />
          ) : paused ? (
            <PauseCircle size={17} />
          ) : (
            <PanelRightOpen size={17} />
          )}
          <span>流程</span>
        </button>
      )}
    </aside>
  )
}
