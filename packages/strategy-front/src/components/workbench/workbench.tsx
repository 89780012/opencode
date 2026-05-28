import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react"
import { ChartColumn, Clock3, Code, MessageSquareMore, Workflow } from "lucide-react"
import {
  createBacktest,
  createReviewSteps,
  createSessions,
  type ReviewStatus,
  type SessionItem,
  type SidebarTab,
  type Stage,
  type Step,
  type TimelineEvent,
} from "./data"
import { clamp, sleep } from "./lib"
import { Backtest } from "./features/backtest"
import { CodePanel } from "./features/code"
import { Flow } from "./features/flow"
import { Modal } from "./features/modal"
import { Review } from "./features/review"
import { Session } from "./features/session"
import { Side } from "./features/side"
import { Timeline } from "./features/timeline"
import { Handle } from "./layout/handle"
import shell from "./layout/shell.module.css"
import ui from "./shared.module.css"

export function Workbench() {
  const [sessions, setSessions] = useState(() => createSessions())
  const [active, setActive] = useState("sess-1")
  const [stage, setStage] = useState<Stage>("session")
  const [tab, setTab] = useState<SidebarTab>("requirements")
  const [right, setRight] = useState(false)
  const [left, setLeft] = useState(300)
  const [side, setSide] = useState(360)
  const [draft, setDraft] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const [analysis, setAnalysis] = useState("")
  const [note, setNote] = useState("")
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState({ on: false, x: 0, y: 0, ox: 0, oy: 0 })
  const [size, setSize] = useState<null | { kind: "left" | "right"; x: number; w: number }>(null)
  const [tip, setTip] = useState<null | { item: TimelineEvent; x: number; y: number }>(null)
  const [plot, setPlot] = useState({ w: 0, h: 0 })
  const [modal, setModal] = useState(false)
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState("新建策略会话")
  const [reqs, setReqs] = useState<string[]>(["请描述你的策略需求"])
  const boxRef = useRef<HTMLDivElement | null>(null)

  const cur = useMemo(() => sessions.find((item) => item.id === active) ?? sessions[0], [active, sessions])
  const issues = useMemo(
    () =>
      sessions.flatMap((item) =>
        item.messages
          .filter((msg) => msg.role === "user")
          .map((msg) => ({ sid: item.id, name: item.name, body: msg.body })),
      ),
    [sessions],
  )
  const last = cur.reviewHistory.at(-1) ?? null
  const picks = cur.timelineEvents.filter((item) => picked.includes(item.id))
  const risk = useMemo(() => {
    if (cur.reviewStatus === "passed") return "审查已通过"
    if (cur.reviewStatus === "failed") return "审查未通过，需要修复"
    if (cur.reviewStatus === "running") return "审查进行中"
    return "代码等待审查"
  }, [cur.reviewStatus])
  const hint = useMemo(() => {
    const list = [risk]
    if (cur.flowchartStatus === "done") list.push("流程图已生成")
    if (cur.backtestStatus === "done" && cur.backtestResults) list.push(`回测收益 ${cur.backtestResults.totalReturn}`)
    return list.join(" / ")
  }, [cur.backtestResults, cur.backtestStatus, cur.flowchartStatus, risk])
  const pane = useMemo(() => {
    const w = plot.w || 800
    const h = plot.h || 600
    const total = Math.max(h * 2.2, cur.timelineEvents.length * 100)
    const axis = w * 0.25
    const top = 60
    const bot = 60
    const span = Math.max(total - top - bot, 120)
    return {
      w,
      h: total,
      axis,
      top,
      marks: cur.timelineEvents.map((_, idx) => top + (idx / Math.max(cur.timelineEvents.length - 1, 1)) * span),
    }
  }, [cur.timelineEvents, plot])

  useEffect(() => {
    setPicked([])
    setAnalysis("")
    setNote("")
    setTip(null)
  }, [active])

  useEffect(() => {
    const node = boxRef.current
    if (!node || stage !== "timeline") return

    const sync = () => {
      setPlot({
        w: node.clientWidth,
        h: node.clientHeight,
      })
    }

    sync()
    const obs = new ResizeObserver(sync)
    obs.observe(node)
    return () => obs.disconnect()
  }, [stage])

  useEffect(() => {
    if (!modal) return

    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setModal(false)
    }

    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [busy, modal])

  useEffect(() => {
    if (!drag.on) return
    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"
    document.body.style.touchAction = "none"

    const move = (event: globalThis.PointerEvent) => {
      setPan({
        x: drag.ox + event.clientX - drag.x,
        y: drag.oy + event.clientY - drag.y,
      })
    }

    const up = () => {
      setDrag((item) => ({ ...item, on: false }))
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
      document.body.style.touchAction = ""
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  }, [drag])

  useEffect(() => {
    if (!size) return
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"
    document.body.style.touchAction = "none"

    const move = (event: globalThis.PointerEvent) => {
      if (size.kind === "left") {
        setLeft(clamp(size.w + event.clientX - size.x, 220, 460))
        return
      }
      setSide(clamp(size.w + size.x - event.clientX, 280, 500))
    }

    const up = () => {
      setSize(null)
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
      document.body.style.touchAction = ""
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  }, [size])

  const patch = (fn: (item: SessionItem) => SessionItem) => {
    setSessions((list) => list.map((item) => (item.id === active ? fn(item) : item)))
  }

  const copy = async () => {
    await navigator.clipboard.writeText(cur.codeContent)
  }

  const send = (review = false) => {
    const body = draft.trim()
    if (!body) return

    patch((item) => ({
      ...item,
      messages: [
        ...item.messages,
        { role: "user", body },
        {
          role: "ai",
          body: review
            ? `已记录审查意见：“${body}”。下一轮审查会重点关注这个问题。`
            : `已收到修改意见：“${body}”。我会同步更新策略代码与说明。`,
        },
      ],
      codeContent: `${item.codeContent}\n\n# ${body}`,
    }))

    setDraft("")
    if (review) void triggerReview()
  }

  const triggerReview = async () => {
    if (cur.reviewStatus === "running") return

    const next = createReviewSteps()
    const round = cur.reviewHistory.length + 1

    patch((item) => ({
      ...item,
      reviewStatus: "running",
      reviewView: "current",
      reviewRound: round,
      reviewProgress: next,
    }))
    setRight(true)

    for (let i = 0; i < next.length; i += 1) {
      await sleep(160)
      patch((item) => ({
        ...item,
        reviewProgress:
          item.reviewProgress?.map((entry, idx) => (idx === i ? { ...entry, status: "running" } : entry)) ?? null,
      }))
      await sleep(220)
      patch((item) => ({
        ...item,
        reviewProgress:
          item.reviewProgress?.map((entry, idx) =>
            idx === i ? { ...entry, status: idx === 3 || idx === 4 ? "error" : "done" } : entry,
          ) ?? null,
      }))
    }

    patch((item) => {
      const steps = item.reviewProgress ?? []
      const status: ReviewStatus = steps.some((entry) => entry.status === "error") ? "failed" : "passed"
      return {
        ...item,
        reviewStatus: status,
        reviewView: "current",
        reviewProgress: null,
        reviewHistory: [
          ...item.reviewHistory,
          {
            round,
            status,
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            steps: steps as Step[],
            suggestions: status === "failed" ? ["优先检查空仓保护", "补充最大回撤保护", "修复边界条件分支"] : [],
          },
        ],
      }
    })
  }

  const runBacktest = async () => {
    if (cur.backtestStatus === "running") return

    setStage("backtest")
    patch((item) => ({
      ...item,
      backtestStatus: "running",
    }))
    await sleep(650)
    patch((item) => {
      const result = createBacktest()
      return {
        ...item,
        backtestStatus: "done",
        backtestResults: result,
        backtestHistory: [
          {
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            results: result,
          },
          ...item.backtestHistory,
        ],
      }
    })
  }

  const showBacktest = (idx: number) => {
    const item = cur.backtestHistory[idx]
    if (!item) return
    patch((entry) => ({
      ...entry,
      backtestResults: item.results,
      backtestStatus: "done",
    }))
    setStage("backtest")
  }

  const createSession = async () => {
    if (step === 1) {
      setBusy(true)
      await sleep(500)
      setBusy(false)
      setStep(2)
      return
    }

    if (step === 2) {
      setStep(3)
      return
    }

    const name = title.trim() || "新建策略会话"
    const list = reqs.map((item) => item.trim()).filter(Boolean)
    const item: SessionItem = {
      ...createSessions()[0],
      id: `sess-${Date.now()}`,
      name,
      currentRequirement: list[0] ?? "请描述你的策略需求",
      analyzedRequirements: list.length ? list : ["请描述你的策略需求"],
      messages: [
        {
          role: "ai",
          body: `会话《${name}》已创建。你可以继续补充需求，或直接发起审查。`,
        },
      ],
      reviewStatus: "idle",
      reviewRound: 0,
      reviewView: "current",
      reviewHistory: [],
      reviewProgress: null,
    }

    setSessions((list) => [item, ...list])
    setActive(item.id)
    setModal(false)
    setStep(1)
    setBusy(false)
    setTitle("新建策略会话")
    setReqs(["请描述你的策略需求"])
    setStage("session")
    setTab("requirements")
    setRight(true)
  }

  const rename = (id: string) => {
    const item = sessions.find((entry) => entry.id === id)
    if (!item) return
    const name = window.prompt("新名称", item.name)?.trim()
    if (!name) return
    setSessions((list) => list.map((entry) => (entry.id === id ? { ...entry, name } : entry)))
  }

  const remove = (id: string) => {
    if (sessions.length === 1) return
    if (!window.confirm("确定删除这个策略会话吗？")) return

    const list = sessions.filter((entry) => entry.id !== id)
    setSessions(list)
    if (active === id) setActive(list[0]?.id ?? "")
  }

  const toggle = (key: string) => {
    patch((item) => ({
      ...item,
      sections: {
        ...item.sections,
        [key]: !item.sections[key],
      },
    }))
  }

  const pick = (id: string) => {
    setPicked((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]))
  }

  const hover = (item: TimelineEvent, x: number, y: number) => {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    setTip({
      item,
      x: clamp(x - box.left + 18, 16, Math.max(box.width - 280, 16)),
      y: clamp(y - box.top + 18, 16, Math.max(box.height - 120, 16)),
    })
  }

  const focus = (item: TimelineEvent, node: HTMLElement) => {
    const wrap = boxRef.current?.getBoundingClientRect()
    const box = node.getBoundingClientRect()
    if (!wrap) return
    setTip({
      item,
      x: clamp(box.right - wrap.left + 12, 16, Math.max(wrap.width - 280, 16)),
      y: clamp(box.top - wrap.top + 8, 16, Math.max(wrap.height - 120, 16)),
    })
  }

  const wheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const box = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - box.left
    const y = event.clientY - box.top
    setZoom((old) => {
      const next = clamp(old + (event.deltaY > 0 ? -8 : 8), 20, 250)
      const from = old / 100
      const to = next / 100
      setPan((cur) => ({
        x: x - ((x - cur.x) / from) * to,
        y: y - ((y - cur.y) / from) * to,
      }))
      return next
    })
  }

  const keypick = (event: KeyboardEvent<HTMLElement>, item: TimelineEvent) => {
    if (item.type !== "git") return
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    pick(item.id)
  }

  const grab = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    event.preventDefault()
    const target = event.target as HTMLElement
    if (target.closest("[data-node]") || target.closest("[data-tip]")) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ on: true, x: event.clientX, y: event.clientY, ox: pan.x, oy: pan.y })
  }

  const resize = (kind: "left" | "right", event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setSize({ kind, x: event.clientX, w: kind === "left" ? left : side })
  }

  const keysize = (kind: "left" | "right", event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 24 : 12
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()

    if (kind === "left") {
      setLeft((item) => clamp(item + (event.key === "ArrowRight" ? step : -step), 220, 460))
      return
    }

    setSide((item) => clamp(item + (event.key === "ArrowLeft" ? step : -step), 280, 500))
  }

  const submit = () => {
    if (!picks.length) return
    setAnalysis(
      `已分析 ${picks.map((item) => item.commitHash ?? item.label).join("、")} 之间的变化，建议优先检查风控顺序、空仓保护和信号过滤。`,
    )
    if (!note.trim()) {
      setNote("分析所选 Git 节点间的代码差异、风控路径和审查结论。")
    }
  }

  return (
    <div className={ui.root}>
      <div
        className={shell.shell}
        data-workbench
        style={
          {
            "--left": `${left}px`,
            "--side": `${right ? side : 0}px`,
          } as CSSProperties
        }
      >
        <Side
          tab={tab}
          cur={cur}
          sessions={sessions}
          issues={issues}
          risk={risk}
          hint={hint}
          onTab={setTab}
          onToggle={toggle}
          onPick={setActive}
          onModal={() => setModal(true)}
          onStage={setStage}
          onRename={rename}
          onDelete={remove}
          onBacktest={showBacktest}
        />

        <Handle
          onDown={(event) => resize("left", event)}
          onKey={(event) => keysize("left", event)}
          active={size?.kind === "left"}
          min={220}
          max={460}
          now={left}
          label="Resize left panel"
        />

        <main className={shell.main}>
          <div className={shell.topbar} style={{ fontSize: 12 }}>
            <div className={shell.toptabs}>
              <button
                type="button"
                className={`${shell.topbtn} ${stage === "session" ? shell.topactive : ""}`}
                onClick={() => setStage("session")}
              >
                <MessageSquareMore size={14} />
                <span>会话与审查</span>
              </button>
              <button
                type="button"
                className={`${shell.topbtn} ${stage === "flowchart" ? shell.topactive : ""}`}
                onClick={() => setStage("flowchart")}
              >
                <Workflow size={14} />
                <span>流程图</span>
              </button>
              <button
                type="button"
                className={`${shell.topbtn} ${stage === "code" ? shell.topactive : ""}`}
                onClick={() => setStage("code")}
              >
                <Code size={14} />
                <span>代码</span>
              </button>
              <button
                type="button"
                className={`${shell.topbtn} ${stage === "backtest" ? shell.topactive : ""}`}
                onClick={() => setStage("backtest")}
              >
                <ChartColumn size={14} />
                <span>回测</span>
              </button>
              <button
                type="button"
                className={`${shell.topbtn} ${stage === "timeline" ? shell.topactive : ""}`}
                onClick={() => setStage("timeline")}
              >
                <Clock3 size={14} />
                <span>时间线</span>
              </button>
            </div>
            <div className={shell.current}>当前会话：{cur.name}</div>
          </div>

          {stage === "session" ? <Session cur={cur} draft={draft} onDraft={setDraft} onSend={send} /> : null}
          {stage === "flowchart" ? <Flow cur={cur} id={active} onRun={() => void runBacktest()} /> : null}
          {stage === "code" ? <CodePanel cur={cur} onCopy={() => void copy()} /> : null}
          {stage === "backtest" ? <Backtest cur={cur} onRun={() => void runBacktest()} /> : null}
          {stage === "timeline" ? (
            <Timeline
              cur={cur}
              picked={picked}
              picks={picks}
              analysis={analysis}
              note={note}
              zoom={zoom}
              pan={pan}
              drag={drag}
              tip={tip}
              pane={pane}
              boxRef={boxRef}
              onNote={setNote}
              onPick={pick}
              onSubmit={submit}
              onReset={() => {
                setPicked([])
                setAnalysis("")
                setNote("")
              }}
              onZoom={setZoom}
              onPan={setPan}
              onHover={hover}
              onFocus={focus}
              onHide={() => setTip(null)}
              onWheel={wheel}
              onGrab={grab}
              onKey={keypick}
            />
          ) : null}
        </main>

        <Review
          cur={cur}
          last={last}
          right={right}
          side={side}
          size={size?.kind === "right"}
          onDown={(event) => resize("right", event)}
          onKey={(event) => keysize("right", event)}
          onView={() =>
            patch((item) => ({
              ...item,
              reviewView: item.reviewView === "current" ? "history" : "current",
            }))
          }
          onClose={() => setRight(false)}
          onOpen={() => setRight(true)}
          onRun={() => void triggerReview()}
        />
      </div>

      <Modal
        open={modal}
        busy={busy}
        step={step}
        title={title}
        reqs={reqs}
        onClose={() => setModal(false)}
        onStep={setStep}
        onTitle={setTitle}
        onReqs={setReqs}
        onSubmit={() => void createSession()}
      />
    </div>
  )
}
